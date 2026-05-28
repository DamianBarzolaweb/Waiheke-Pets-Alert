import os
import random
import re
import uuid
from html import escape
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from sqlalchemy import func, inspect, text
from dotenv import load_dotenv
from flask import Flask, abort, jsonify, redirect, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///waiheke_pets.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if (
    DATABASE_URL.startswith("postgresql")
    and os.getenv("DYNO")
    and "sqlite" not in DATABASE_URL.lower()
    and "sslmode=" not in DATABASE_URL
):
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-cambiar-en-produccion")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", app.config["SECRET_KEY"])
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

_default_cors = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_extra_cors = os.getenv("CORS_ORIGINS", "").strip()
_cors_origins = list(_default_cors)
if _extra_cors:
    _cors_origins.extend(o.strip() for o in _extra_cors.split(",") if o.strip())

CORS(
    app,
    origins=_cors_origins,
    supports_credentials=True,
)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "100 per hour"],
)

db = SQLAlchemy(app)


@app.before_request
def _redirect_http_to_https():
    """On Heroku, external HTTP hits still reach the app with X-Forwarded-Proto: http — redirect to HTTPS."""

    if not os.getenv("DYNO"):
        return None
    if request.headers.get("X-Forwarded-Proto", "").lower() != "http":
        return None
    host = request.headers.get("Host", "")
    if not host:
        return None
    return redirect(f"https://{host}{request.full_path}", code=301)


@app.before_request
def _redirect_apex_host_to_www():
    """Custom domain is on www.*; apex without DNS breaks shared links — send to www when it hits the app."""
    if not os.getenv("DYNO"):
        return None
    host = (request.headers.get("Host") or "").split(":")[0].strip().lower()
    if host != "waihekepetsalert.co.nz":
        return None
    proto = (
        request.headers.get("X-Forwarded-Proto") or request.scheme or "https"
    ).split(",")[0].strip().lower()
    if proto not in ("http", "https"):
        proto = "https"
    return redirect(f"{proto}://www.waihekepetsalert.co.nz{request.full_path}", code=301)


def utcnow():
    return datetime.now(timezone.utc)


def email_only_registration() -> bool:
    """When enabled (default on), signup uses email OTP only; WhatsApp/Twilio step is skipped.
    Set REGISTRATION_EMAIL_ONLY=0|false|no to restore phone/SMS OTP via Twilio."""

    return os.getenv("REGISTRATION_EMAIL_ONLY", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    )


def _normalize_login_email(email: str) -> str:
    return (email or "").strip().lower()


def _valid_signup_email(normalized_lowercase: str) -> bool:
    e = normalized_lowercase
    if len(e) < 5 or len(e) > 118:
        return False
    return bool(re.match(r"^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$", e))


def skip_whatsapp_otp_enabled() -> bool:
    """Sin OTP de WhatsApp si SKIP_WHATSAPP_OTP: en desarrollo siempre permitido si está activo; en producción solo con ALLOW_SKIP_PHONE_OTP_IN_PRODUCTION."""
    skip = os.getenv("SKIP_WHATSAPP_OTP", "").strip().lower() in ("1", "true", "yes")
    if not skip:
        return False
    if (os.getenv("FLASK_ENV") or "").strip().lower() == "development":
        return True
    return os.getenv("ALLOW_SKIP_PHONE_OTP_IN_PRODUCTION", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def humanize_reported_ago(created: datetime) -> str:
    if not created:
        return "Reported recently"
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    delta = utcnow() - created
    seconds = int(max(0, delta.total_seconds()))
    if seconds < 3600:
        m = max(1, seconds // 60)
        return f"Reported {m}m ago"
    if seconds < 86400:
        h = max(1, seconds // 3600)
        return f"Reported {h}h ago"
    d = max(1, seconds // 86400)
    return f"Reported {d}d ago"


def format_date_reported(created: datetime) -> str:
    if not created:
        return ""
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return created.strftime("%d %b %Y, %I:%M %p").lstrip("0").replace(" 0", " ")


class Usuario(db.Model):
    __tablename__ = "usuarios"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(200), nullable=False)
    nombre_completo = db.Column(db.String(100), nullable=False, default="")
    fecha_registro = db.Column(db.DateTime, default=lambda: datetime.utcnow())
    es_admin = db.Column(db.Boolean, default=False)
    # Misma idea que Waiheke Latinos
    whatsapp = db.Column(db.String(20), unique=True, nullable=True)
    whatsapp_verificado = db.Column(db.Boolean, default=False)
    email_verificado = db.Column(db.Boolean, default=False)
    codigo_verificacion = db.Column(db.String(6), nullable=True)
    fecha_codigo = db.Column(db.DateTime, nullable=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def generar_codigo_verificacion_email(self) -> str:
        self.codigo_verificacion = "".join(str(random.randint(0, 9)) for _ in range(6))
        self.fecha_codigo = datetime.now(timezone.utc)
        return self.codigo_verificacion


class RegistroPendiente(db.Model):
    """Pending signup until phone or email OTP succeeds."""

    __tablename__ = "registro_pendiente"
    id = db.Column(db.String(36), primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    nombre_completo = db.Column(db.String(100), nullable=False)
    whatsapp = db.Column(db.String(20), nullable=False)
    otp_whatsapp = db.Column(db.String(6), nullable=True)
    otp_email = db.Column(db.String(6), nullable=True)
    creado = db.Column(db.DateTime, default=lambda: datetime.utcnow())
    expira = db.Column(db.DateTime, nullable=False)


class PetAlert(db.Model):
    __tablename__ = "pet_alerts"
    id = db.Column(db.String(80), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    species = db.Column(db.String(20), nullable=False, default="dog")
    breed = db.Column(db.String(120), nullable=False, default="")
    breed_variant = db.Column(db.String(20), nullable=False, default="tertiary")
    location = db.Column(db.String(200), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text, nullable=False)
    image_alt = db.Column(db.Text, nullable=False, default="")
    date_reported = db.Column(db.String(120), nullable=True)
    last_seen_window = db.Column(db.String(300), nullable=True)
    detail_location = db.Column(db.String(200), nullable=True)
    full_description = db.Column(db.Text, nullable=True)
    creado = db.Column(db.DateTime, default=lambda: datetime.utcnow())

    sightings = db.relationship(
        "Sighting", backref="pet_alert", lazy=True, cascade="all, delete-orphan", order_by="Sighting.id"
    )


class Sighting(db.Model):
    __tablename__ = "sightings"
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(32), unique=True, nullable=False)
    pet_alert_id = db.Column(db.String(80), db.ForeignKey("pet_alerts.id"), nullable=False)
    author = db.Column(db.String(100), nullable=False)
    time_ago = db.Column(db.String(50), nullable=False)
    body = db.Column(db.Text, nullable=False)
    thumb_url = db.Column(db.String(500), nullable=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    parent_public_id = db.Column(db.String(32), nullable=True)
    creado = db.Column(db.DateTime, default=lambda: datetime.utcnow())


def sighting_to_dict(s: Sighting) -> dict:
    when = humanize_reported_ago(s.creado) if s.creado else (s.time_ago or "Recently")
    return {
        "id": s.public_id,
        "author": s.author,
        "timeAgo": when,
        "body": s.body,
        "thumbUrl": s.thumb_url,
        "parentId": s.parent_public_id or None,
    }


def alert_to_dict(alert: PetAlert) -> dict:
    return {
        "id": alert.id,
        "name": alert.name,
        "status": alert.status,
        "species": alert.species,
        "breed": alert.breed,
        "breedVariant": alert.breed_variant,
        "location": alert.location,
        "lat": alert.lat,
        "lng": alert.lng,
        "description": alert.description,
        "reportedAgo": humanize_reported_ago(alert.creado),
        "imageUrl": alert.image_url,
        "imageAlt": alert.image_alt,
        "dateReported": alert.date_reported or format_date_reported(alert.creado),
        "lastSeenWindow": alert.last_seen_window,
        "detailLocation": alert.detail_location,
        "fullDescription": alert.full_description,
        "sightings": [
            sighting_to_dict(s)
            for s in sorted(
                alert.sightings or [],
                key=lambda x: (x.creado or datetime.min.replace(tzinfo=timezone.utc), x.id),
            )
        ],
    }


def user_to_dict(u: Usuario) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "nombreCompleto": u.nombre_completo or "",
        "whatsapp": u.whatsapp,
        "whatsappVerificado": bool(u.whatsapp_verificado),
        "emailVerificado": bool(u.email_verificado),
        "esAdmin": bool(u.es_admin),
    }


def create_jwt_token(user_id: int, username: str, is_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + app.config["JWT_ACCESS_TOKEN_EXPIRES"],
    }
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")


def verify_jwt_token(token: str):
    try:
        return jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "")
        if token.startswith("Bearer "):
            token = token[7:]
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(payload, *args, **kwargs)

    return decorated


def require_admin(f):
    """Bearer JWT + usuario con ``es_admin``."""

    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "")
        if token.startswith("Bearer "):
            token = token[7:]
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        jwt_payload = verify_jwt_token(token)
        if not jwt_payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        u = Usuario.query.get(jwt_payload.get("user_id"))
        if not u or not u.es_admin:
            return jsonify({"error": "Admin access required"}), 403
        return f(jwt_payload, *args, **kwargs)

    return decorated


def ensure_superadmin_users() -> None:
    """Promote configured usernames to full admin (default: damo)."""
    raw = os.getenv("WPA_SUPERADMIN_USERNAMES", "damo")
    for part in raw.split(","):
        un = part.strip().lower()
        if not un:
            continue
        u = Usuario.query.filter(func.lower(Usuario.username) == un).first()
        if u and not u.es_admin:
            u.es_admin = True
            db.session.commit()


def _apply_alert_patch(row: PetAlert, data: dict) -> str | None:
    """Update alert from JSON body; return error message or None."""
    if "name" in data:
        row.name = (data.get("name") or "").strip()
    if "status" in data:
        st = (data.get("status") or "").strip()
        if st not in ("Lost", "Sighted"):
            return "status must be Lost or Sighted"
        row.status = st
    if "species" in data:
        sp = (data.get("species") or "dog").strip().lower()
        if sp not in ("dog", "cat"):
            return "species must be dog or cat"
        row.species = sp
    if "breed" in data:
        row.breed = (data.get("breed") or "").strip() or "Unknown"
    if "breedVariant" in data:
        bv = (data.get("breedVariant") or "tertiary").strip()
        if bv in ("tertiary", "secondary"):
            row.breed_variant = bv
    if "location" in data:
        row.location = (data.get("location") or "").strip()[:200]
    if "description" in data:
        row.description = (data.get("description") or "").strip()[:2000]
    if "fullDescription" in data:
        row.full_description = (data.get("fullDescription") or "").strip() or None
    if "imageUrl" in data:
        row.image_url = (data.get("imageUrl") or "").strip()
    if "imageAlt" in data:
        row.image_alt = (data.get("imageAlt") or "").strip()
    if "lastSeenWindow" in data:
        row.last_seen_window = (data.get("lastSeenWindow") or "").strip() or None
    if "detailLocation" in data:
        row.detail_location = (data.get("detailLocation") or "").strip() or None
    if "lat" in data or "lng" in data:
        try:
            lat_f = float(data.get("lat", row.lat))
            lng_f = float(data.get("lng", row.lng))
        except (TypeError, ValueError):
            return "valid lat and lng are required"
        row.lat = max(-37.05, min(-36.68, lat_f))
        row.lng = max(174.85, min(175.28, lng_f))
    if row.status == "Lost" and not (row.name or "").strip():
        return "name is required for Lost alerts"
    if not (row.description or "").strip():
        return "description is required"
    return None


def seed_if_empty() -> None:
    from seed_data import INITIAL_ALERTS

    if PetAlert.query.first() is not None:
        return
    for a in INITIAL_ALERTS:
        pa = PetAlert(
            id=a["id"],
            name=a["name"],
            status=a["status"],
            species=a["species"],
            breed=a["breed"],
            breed_variant=a.get("breedVariant", "tertiary"),
            location=a["location"],
            lat=a["lat"],
            lng=a["lng"],
            description=a["description"],
            image_url=a["imageUrl"],
            image_alt=a.get("imageAlt", ""),
            date_reported=a.get("dateReported"),
            last_seen_window=a.get("lastSeenWindow"),
            detail_location=a.get("detailLocation"),
            full_description=a.get("fullDescription"),
        )
        db.session.add(pa)
        for s in a.get("sightings") or []:
            db.session.add(
                Sighting(
                    public_id=s["id"],
                    pet_alert_id=a["id"],
                    author=s["author"],
                    time_ago=s["timeAgo"],
                    body=s["body"],
                )
            )
    db.session.commit()


def migrate_demo_images_from_google() -> None:
    """Las URLs de Google AIDA suelen no cargar en <img> (403 o enlace caduco)."""
    from seed_data import DEMO_IMAGES

    changed = False
    for pid, url in DEMO_IMAGES.items():
        row = PetAlert.query.get(pid)
        if not row or not row.image_url:
            continue
        if "googleusercontent.com" in row.image_url or "aida-public" in row.image_url:
            row.image_url = url
            changed = True
    if changed:
        db.session.commit()


def prune_configured_alert_posts() -> None:
    """Remove pet_alerts rows (e.g. test posts). Idempotent.

    ``PRUNE_ALERT_IDS``: comma-separated ids to delete (empty values are skipped).
    Values ``none`` / ``false`` / ``0`` mean “no ids from this env var”.

    ``PRUNE_ALERT_NAMES``: comma-separated pet ``name`` values (case-insensitive), e.g. ``Mango``

    If both ids and names are empty after parsing, nothing is deleted.

    To remove a stray post once: set ``PRUNE_ALERT_NAMES=Mango``, deploy, then ``heroku config:unset``.
    """
    raw_ids = os.getenv("PRUNE_ALERT_IDS")

    ids: list[str] = []
    if raw_ids is not None:
        s = raw_ids.strip()
        if s.lower() not in ("", "none", "false", "0"):
            ids = [x.strip() for x in s.split(",") if x.strip()]

    raw_names = os.getenv("PRUNE_ALERT_NAMES")
    names: list[str] = []
    if raw_names is not None:
        ns = raw_names.strip()
        if ns.lower() not in ("", "none", "false", "0"):
            names = [x.strip().lower() for x in raw_names.split(",") if x.strip()]

    if not ids and not names:
        return

    changed = False
    for aid in ids:
        row = PetAlert.query.get(aid)
        if row:
            db.session.delete(row)
            changed = True
    if names:
        for row in PetAlert.query.filter(func.lower(PetAlert.name).in_(names)).all():
            db.session.delete(row)
            changed = True
    if changed:
        db.session.commit()


def migrate_registro_pendiente_otp_whatsapp() -> None:
    try:
        insp = inspect(db.engine)
        tables = insp.get_table_names()
        if "registro_pendiente" not in tables:
            return
        cols = {c["name"] for c in insp.get_columns("registro_pendiente")}
        if "otp_whatsapp" not in cols:
            db.session.execute(text("ALTER TABLE registro_pendiente ADD COLUMN otp_whatsapp VARCHAR(6)"))
            db.session.commit()
            cols.add("otp_whatsapp")
        if "otp_email" not in cols:
            db.session.execute(text("ALTER TABLE registro_pendiente ADD COLUMN otp_email VARCHAR(6)"))
            db.session.commit()
    except Exception as e:
        print(f"migrate_registro_pendiente_otp_whatsapp: {e}")
        db.session.rollback()


def migrate_sighting_comment_columns() -> None:
    """Community posts/replies on alert detail."""
    try:
        insp = inspect(db.engine)
        if "sightings" not in insp.get_table_names():
            return
        is_pg = db.engine.dialect.name == "postgresql"
        ts_col = "TIMESTAMP" if is_pg else "DATETIME"
        cols = {c["name"] for c in insp.get_columns("sightings")}
        pending = []
        if "usuario_id" not in cols:
            pending.append("ALTER TABLE sightings ADD COLUMN usuario_id INTEGER")
        if "parent_public_id" not in cols:
            pending.append("ALTER TABLE sightings ADD COLUMN parent_public_id VARCHAR(32)")
        if "creado" not in cols:
            pending.append(f"ALTER TABLE sightings ADD COLUMN creado {ts_col}")
        for sql in pending:
            db.session.execute(text(sql))
            db.session.commit()
            cols = {c["name"] for c in insp.get_columns("sightings")}
        if "creado" in cols:
            db.session.execute(
                text("UPDATE sightings SET creado = CURRENT_TIMESTAMP WHERE creado IS NULL")
            )
            db.session.commit()
    except Exception as e:
        print(f"migrate_sighting_comment_columns: {e}")
        db.session.rollback()


def migrate_usuario_auth_columns() -> None:
    """SQLite: añade columnas nuevas en bases ya creadas."""
    try:
        insp = inspect(db.engine)
        if "usuarios" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("usuarios")}
        alters = []
        if "whatsapp" not in cols:
            alters.append("ALTER TABLE usuarios ADD COLUMN whatsapp VARCHAR(20)")
        if "whatsapp_verificado" not in cols:
            alters.append(
                "ALTER TABLE usuarios ADD COLUMN whatsapp_verificado BOOLEAN DEFAULT 0"
            )
        if "email_verificado" not in cols:
            alters.append("ALTER TABLE usuarios ADD COLUMN email_verificado BOOLEAN DEFAULT 1")
        if "codigo_verificacion" not in cols:
            alters.append("ALTER TABLE usuarios ADD COLUMN codigo_verificacion VARCHAR(6)")
        if "fecha_codigo" not in cols:
            alters.append("ALTER TABLE usuarios ADD COLUMN fecha_codigo DATETIME")
        for sql in alters:
            db.session.execute(text(sql))
        if alters:
            db.session.commit()
    except Exception as e:
        print(f"migrate_usuario_auth_columns: {e}")
        db.session.rollback()


def ensure_dev_user() -> None:
    """Usuario de prueba opcional (local) — compatible con campos Latinos."""
    user = os.getenv("DEV_USERNAME")
    pw = os.getenv("DEV_PASSWORD")
    if not user or not pw:
        return
    u = Usuario.query.filter_by(username=user).first()
    if u:
        if not u.whatsapp:
            u.whatsapp = "+64900000001"
            u.whatsapp_verificado = True
            u.email_verificado = True
            db.session.commit()
        return
    u = Usuario(
        username=user,
        email=f"{user}@local.dev",
        nombre_completo="Dev",
        whatsapp="+64900000001",
        whatsapp_verificado=True,
        email_verificado=True,
    )
    u.set_password(pw)
    db.session.add(u)
    db.session.commit()


def _slug_id(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (name or "pet").lower()).strip("-") or "pet"
    return f"{base}-{uuid.uuid4().hex[:8]}"


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "waiheke-pets-alert"})


@app.route("/api/auth/registration-options", methods=["GET"])
def registration_options():
    """So the SPA can hide phone fields when signup is email-only."""
    return jsonify({"emailOnly": email_only_registration()})


@app.route("/api/alerts", methods=["GET"])
def list_alerts():
    rows = PetAlert.query.order_by(PetAlert.creado.desc()).all()
    return jsonify([alert_to_dict(r) for r in rows])


@app.route("/api/alerts/<string:alert_id>", methods=["GET"])
def get_alert(alert_id: str):
    r = PetAlert.query.get(alert_id)
    if not r:
        return jsonify({"error": "not_found"}), 404
    return jsonify(alert_to_dict(r))


@app.route("/api/alerts/<string:alert_id>/comments", methods=["POST"])
@limiter.limit("60 per hour")
@require_auth
def create_alert_comment(alert_id: str, payload):
    alert = PetAlert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(silent=True) or {}
    body = (data.get("body") or "").strip()
    if not body:
        return jsonify({"error": "Comment text is required."}), 400
    if len(body) > 2000:
        return jsonify({"error": "Comment must be under 2000 characters."}), 400
    parent_id = (data.get("parentId") or data.get("parent_id") or "").strip() or None
    if parent_id:
        parent = Sighting.query.filter_by(
            public_id=parent_id, pet_alert_id=alert_id
        ).first()
        if not parent:
            return jsonify({"error": "Parent comment not found on this alert."}), 400
        if parent.parent_public_id:
            return jsonify({"error": "Replies can only be added to top-level posts."}), 400
    u = Usuario.query.get(payload["user_id"])
    if not u:
        return jsonify({"error": "User not found"}), 404
    author = (u.nombre_completo or "").strip() or u.username
    now = datetime.utcnow()
    row = Sighting(
        public_id=uuid.uuid4().hex[:16],
        pet_alert_id=alert_id,
        author=author[:100],
        time_ago=humanize_reported_ago(now),
        body=body,
        usuario_id=u.id,
        parent_public_id=parent_id,
        creado=now,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify(sighting_to_dict(row)), 201


def _parse_create_alert_request():
    """JSON body or multipart form (report form with photo)."""
    ct = (request.content_type or "").lower()
    if "multipart/form-data" in ct:
        return dict(request.form), request.files.get("photo")
    return request.get_json(silent=True) or {}, None


@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_uploaded_photo(filename: str):
    from photo_storage import local_upload_path

    path = local_upload_path(filename)
    if not path:
        abort(404)
    directory = os.path.dirname(path)
    return send_from_directory(directory, os.path.basename(path), max_age=86400)


@app.route("/api/alerts", methods=["POST"])
@limiter.limit("20 per hour")
@require_auth
def create_alert(payload):
    from photo_storage import store_alert_photo

    data, photo_file = _parse_create_alert_request()
    kind = (data.get("kind") or data.get("status") or "lost").lower()
    status = "Lost" if kind in ("lost", "perdido") else "Sighted"
    pet_name = (data.get("petName") or data.get("name") or "").strip()
    if status == "Lost" and not pet_name:
        return jsonify({"error": "petName is required for lost pets"}), 400
    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "description is required"}), 400
    breed = (data.get("breed") or "").strip() or "Unknown"
    seen_date = (data.get("seenDate") or "").strip()
    seen_time = (data.get("seenTime") or "").strip()
    last_seen = " — ".join(x for x in [seen_date, seen_time] if x)
    try:
        lat_f = float(data["lat"])
        lng_f = float(data["lng"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "valid lat and lng are required"}), 400
    lat_f = max(-37.05, min(-36.68, lat_f))
    lng_f = max(174.85, min(175.28, lng_f))
    location_txt = (
        data.get("location") or "").strip() or f"Approx. pin {lat_f:.4f}°, {lng_f:.4f}°"

    alt_hint = f"Photo for {pet_name}" if pet_name else "Photo of sighted pet"
    default_image = (
        "https://images.unsplash.com/photo-1548199973-03cce0bbc87a"
        "?w=800&q=80&auto=format&fit=crop"
    )
    image_url = default_image
    image_alt = alt_hint
    if photo_file and (photo_file.filename or "").strip():
        base = _canonical_public_base_url()
        image_url, image_alt, upload_err = store_alert_photo(
            photo_file, public_base_url=base, alt_hint=alt_hint
        )
        if upload_err:
            return jsonify({"error": upload_err}), 400
    elif "multipart/form-data" in (request.content_type or "").lower():
        return jsonify({"error": "Photo file is required."}), 400

    aid = _slug_id(pet_name)
    while PetAlert.query.get(aid):
        aid = _slug_id(pet_name)
    now = datetime.utcnow()
    pa = PetAlert(
        id=aid,
        name=pet_name,
        status=status,
        species="dog",
        breed=breed,
        breed_variant="tertiary",
        location=location_txt[:200],
        lat=lat_f,
        lng=lng_f,
        description=description[:2000],
        image_url=image_url,
        image_alt=image_alt,
        last_seen_window=last_seen or None,
        full_description=description,
        creado=now,
    )
    db.session.add(pa)
    db.session.commit()
    return jsonify(alert_to_dict(pa)), 201


@app.route("/api/admin/alerts", methods=["GET"])
@require_admin
def admin_list_alerts(_payload):
    rows = PetAlert.query.order_by(PetAlert.creado.desc()).all()
    return jsonify([alert_to_dict(r) for r in rows])


@app.route("/api/admin/alerts/<string:alert_id>", methods=["PATCH"])
@require_admin
def admin_update_alert(_payload, alert_id: str):
    row = PetAlert.query.get(alert_id)
    if not row:
        return jsonify({"error": "not_found"}), 404
    data = request.get_json(silent=True) or {}
    err = _apply_alert_patch(row, data)
    if err:
        return jsonify({"error": err}), 400
    db.session.commit()
    return jsonify(alert_to_dict(row))


@app.route("/api/admin/alerts/<string:alert_id>", methods=["DELETE"])
@require_admin
def admin_delete_alert(_payload, alert_id: str):
    row = PetAlert.query.get(alert_id)
    if not row:
        return jsonify({"error": "not_found"}), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify({"ok": True, "id": alert_id})


@app.route("/api/auth/register/start", methods=["POST"])
@limiter.limit("15 per hour")
def register_start():
    from latinos_auth_utils import (
        enviar_email_verificacion_mailgun_pets,
        generar_codigo_seis,
        iniciar_verificacion_whatsapp,
        validar_numero_whatsapp,
    )

    data = request.get_json(silent=True) or {}
    if data.get("aceptoTerminos") not in (True, 1, "1", "true", "yes"):
        return jsonify(
            {"error": "You must accept the Terms & Conditions and Privacy Policy."}
        ), 400
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    nombre = (data.get("nombreCompleto") or "").strip()
    email_raw_in = _normalize_login_email(data.get("email") or "")
    whatsapp_raw = (data.get("whatsapp") or "").strip()
    if not username or len(username) < 2:
        return jsonify({"error": "Username must be at least 2 characters."}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if not nombre:
        return jsonify({"error": "Full name is required."}), 400

    if email_only_registration():
        if not email_raw_in:
            return jsonify({"error": "Email is required."}), 400
        if not _valid_signup_email(email_raw_in):
            return jsonify({"error": "Invalid email address."}), 400
        phone_opt = None
        wa_store = ""
        if whatsapp_raw:
            ok, phone_opt, err = validar_numero_whatsapp(whatsapp_raw)
            if not ok or not phone_opt:
                return jsonify({"error": err or "Invalid phone number"}), 400
            wa_store = phone_opt

        if Usuario.query.filter_by(username=username).first():
            return jsonify({"error": "This username is already taken."}), 400
        if wa_store and Usuario.query.filter_by(whatsapp=wa_store).first():
            return jsonify({"error": "This phone number is already registered."}), 400
        if Usuario.query.filter(func.lower(Usuario.email) == email_raw_in).first():
            return jsonify({"error": "This email is already registered."}), 400

        q_email = db.session.query(RegistroPendiente).filter(
            RegistroPendiente.email.isnot(None), func.lower(RegistroPendiente.email) == email_raw_in
        )
        for rp in q_email.all():
            db.session.delete(rp)
        if wa_store:
            for rp in RegistroPendiente.query.filter(RegistroPendiente.whatsapp == wa_store).all():
                db.session.delete(rp)
        for rp in RegistroPendiente.query.filter(RegistroPendiente.username == username).all():
            db.session.delete(rp)
        db.session.commit()

        otp_plain = generar_codigo_seis()
        rid = str(uuid.uuid4())
        pr = RegistroPendiente(
            id=rid,
            username=username,
            password_hash=generate_password_hash(password),
            nombre_completo=nombre,
            email=email_raw_in,
            whatsapp=wa_store if wa_store else "",
            expira=datetime.utcnow() + timedelta(hours=1),
            otp_whatsapp=None,
            otp_email=otp_plain,
        )
        db.session.add(pr)
        db.session.commit()
        if not enviar_email_verificacion_mailgun_pets(email_raw_in, otp_plain, nombre):
            db.session.delete(pr)
            db.session.commit()
            mg_domain = (os.getenv("MAILGUN_DOMAIN") or "").lower()
            err = "Could not send the verification email. Try again."
            if "sandbox" in mg_domain:
                err = (
                    "Could not send the verification email. Mailgun sandbox only delivers to "
                    "authorized addresses — open the Mailgun invite in your inbox and click "
                    "Verify, or add a verified sending domain for production."
                )
            return jsonify({"error": err}), 502
        body: dict = {
            "registrationId": rid,
            "message": "Verification code sent to your email.",
            "verificationChannel": "email",
            "skipPhoneOtp": True,
        }
        flask_env = (os.getenv("FLASK_ENV") or "").strip().lower()
        expose = flask_env == "development" or (
            os.getenv("DEV_EXPOSE_REGISTRATION_OTP", "").strip().lower() in ("1", "true", "yes")
        )
        if expose:
            body["devVerificationCode"] = otp_plain
        return jsonify(body)

    # Phone / WhatsApp OTP (Twilio Verify) pathway
    ok, phone, err = validar_numero_whatsapp(whatsapp_raw)
    if not ok or not phone:
        return jsonify({"error": err or "Invalid phone number"}), 400
    email_lc = email_raw_in or None
    if Usuario.query.filter_by(username=username).first():
        return jsonify({"error": "This username is already taken."}), 400
    if Usuario.query.filter_by(whatsapp=phone).first():
        return jsonify({"error": "This phone number is already registered."}), 400
    if email_lc and Usuario.query.filter(func.lower(Usuario.email) == email_lc).first():
        return jsonify({"error": "This email is already registered."}), 400
    for rp in RegistroPendiente.query.filter(RegistroPendiente.whatsapp == phone).all():
        db.session.delete(rp)
    for rp in RegistroPendiente.query.filter(RegistroPendiente.username == username).all():
        db.session.delete(rp)
    db.session.commit()
    if skip_whatsapp_otp_enabled():
        ok_send, otp_plain = True, None
    else:
        ok_send, otp_plain = iniciar_verificacion_whatsapp(phone, nombre)
    rid = str(uuid.uuid4())
    pr = RegistroPendiente(
        id=rid,
        username=username,
        password_hash=generate_password_hash(password),
        nombre_completo=nombre,
        email=email_lc,
        whatsapp=phone,
        expira=datetime.utcnow() + timedelta(hours=1),
        otp_whatsapp=otp_plain,
        otp_email=None,
    )
    db.session.add(pr)
    db.session.commit()
    if not ok_send:
        db.session.delete(pr)
        db.session.commit()
        return jsonify({"error": "Could not send the code. Try again."}), 502
    if skip_whatsapp_otp_enabled():
        msg_register = "Phone verification skipped (development; SKIP_WHATSAPP_OTP)."
    elif otp_plain is None:
        msg_register = f"Verification code sent to {phone}."
    else:
        msg_register = (
            "Local mode: Twilio was not used. Check the server console or the hint below."
        )
    body_phone: dict = {
        "registrationId": rid,
        "message": msg_register,
        "verificationChannel": "phone",
    }
    if skip_whatsapp_otp_enabled():
        body_phone["skipPhoneOtp"] = True
    flask_env = (os.getenv("FLASK_ENV") or "").strip().lower()
    expose_phone = flask_env == "development" or (
        os.getenv("DEV_EXPOSE_REGISTRATION_OTP", "").strip().lower() in ("1", "true", "yes")
    )
    if otp_plain and expose_phone:
        import urllib.parse

        wa_text = (
            f"Waiheke Pets Alert — your code: {otp_plain}\n\n"
            f"(local dev; also shown in the UI and server terminal.)"
        )
        body_phone["devVerificationCode"] = otp_plain
        body_phone["devWhatsappComposeUrl"] = f"https://wa.me/?text={urllib.parse.quote(wa_text)}"
    return jsonify(body_phone)


@app.route("/api/auth/register/resend-email-code", methods=["POST"])
@limiter.limit("10 per hour")
def register_resend_pending_email():
    """Resend OTP for email-only signup (no JWT yet)."""
    from latinos_auth_utils import enviar_email_verificacion_mailgun_pets, generar_codigo_seis

    if not email_only_registration():
        return jsonify({"error": "Not applicable when phone OTP registration is enabled."}), 400
    data = request.get_json(silent=True) or {}
    rid = (data.get("registrationId") or "").strip()
    if not rid:
        return jsonify({"error": "registrationId is required"}), 400
    pr = RegistroPendiente.query.get(rid)
    if not pr or pr.expira < datetime.utcnow():
        return jsonify({"error": "Registration expired. Start again."}), 400
    if not pr.email:
        return jsonify({"error": "Nothing to resend."}), 400
    otp = generar_codigo_seis()
    pr.otp_email = otp
    db.session.commit()
    if enviar_email_verificacion_mailgun_pets(pr.email, otp, pr.nombre_completo):
        return jsonify({"ok": True})
    return jsonify({"error": "Could not send email."}), 502


@app.route("/api/auth/register/verify-phone", methods=["POST"])
@limiter.limit("30 per hour")
def register_verify_phone():
    from latinos_auth_utils import enviar_email_verificacion_mailgun_pets, verificar_codigo_twilio

    data = request.get_json(silent=True) or {}
    rid = (data.get("registrationId") or "").strip()
    code = (data.get("code") or "").strip()
    skip_otp = skip_whatsapp_otp_enabled()
    if not rid:
        return jsonify({"error": "registrationId is required"}), 400

    pr = RegistroPendiente.query.get(rid)
    if not pr or pr.expira < datetime.utcnow():
        return jsonify({"error": "Registration expired. Start again."}), 400

    # Email-only signup: code matches pending row; user is verified in one step.
    if email_only_registration():
        if not code:
            return jsonify({"error": "registrationId and code are required"}), 400
        if pr.otp_email is None or pr.otp_email.strip() != code.strip():
            return jsonify({"error": "Incorrect code."}), 400
        wa_for_user = pr.whatsapp.strip() if pr.whatsapp else ""
        wa_for_user = wa_for_user or None
        if Usuario.query.filter_by(username=pr.username).first():
            db.session.delete(pr)
            db.session.commit()
            return jsonify({"error": "User already exists. Log in instead."}), 400
        if wa_for_user and Usuario.query.filter_by(whatsapp=wa_for_user).first():
            db.session.delete(pr)
            db.session.commit()
            return jsonify({"error": "Phone number already registered."}), 400
        email_p = _normalize_login_email(pr.email) if pr.email else None
        if email_p:
            dup_e = Usuario.query.filter(func.lower(Usuario.email) == email_p).first()
            if dup_e:
                db.session.delete(pr)
                db.session.commit()
                return jsonify({"error": "This email is already registered."}), 400
        u = Usuario(
            username=pr.username,
            email=email_p,
            nombre_completo=pr.nombre_completo,
            whatsapp=wa_for_user,
            whatsapp_verificado=False,
            email_verificado=bool(email_p),
        )
        u.password_hash = pr.password_hash
        db.session.delete(pr)
        db.session.add(u)
        db.session.commit()
        ensure_superadmin_users()
        u = Usuario.query.get(u.id)
        token = create_jwt_token(u.id, u.username, bool(u.es_admin))
        return jsonify(
            {
                "token": token,
                "user": user_to_dict(u),
                "needsEmailVerification": False,
            }
        )

    # Phone OTP pathway
    if not skip_otp and not code:
        return jsonify({"error": "registrationId and code are required"}), 400
    if not skip_otp and not verificar_codigo_twilio(
        pr.whatsapp, code, otp_esperado=pr.otp_whatsapp
    ):
        return jsonify({"error": "Incorrect code."}), 400
    if Usuario.query.filter_by(username=pr.username).first():
        db.session.delete(pr)
        db.session.commit()
        return jsonify({"error": "User already exists. Log in instead."}), 400
    if Usuario.query.filter_by(whatsapp=pr.whatsapp).first():
        db.session.delete(pr)
        db.session.commit()
        return jsonify({"error": "Phone number already registered."}), 400
    raw_email_p = _normalize_login_email(pr.email or "") if pr.email else ""
    email_p = raw_email_p or None
    nombre_p = pr.nombre_completo
    u = Usuario(
        username=pr.username,
        email=email_p,
        nombre_completo=nombre_p,
        whatsapp=pr.whatsapp,
        whatsapp_verificado=True,
        email_verificado=False if email_p else True,
    )
    u.password_hash = pr.password_hash
    db.session.delete(pr)
    db.session.add(u)
    db.session.commit()
    needs_email = bool(email_p)
    if email_p:
        cod = u.generar_codigo_verificacion_email()
        db.session.commit()
        enviar_email_verificacion_mailgun_pets(email_p, cod, nombre_p)
    token = create_jwt_token(u.id, u.username, u.es_admin)
    return jsonify(
        {
            "token": token,
            "user": user_to_dict(u),
            "needsEmailVerification": needs_email and not u.email_verificado,
        }
    )


@app.route("/api/auth/verify-email", methods=["POST"])
@require_auth
def verify_email(payload):
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip()
    u = Usuario.query.get(payload["user_id"])
    if not u or not u.email:
        return jsonify({"error": "No email pending verification."}), 400
    if u.email_verificado:
        tok = create_jwt_token(u.id, u.username, u.es_admin)
        return jsonify({"token": tok, "user": user_to_dict(u)})
    if u.codigo_verificacion != code:
        return jsonify({"error": "Incorrect or expired code (10 min)."}), 400
    if not u.fecha_codigo:
        return jsonify({"error": "Request a new code."}), 400
    fc = u.fecha_codigo
    if fc.tzinfo is None:
        fc = fc.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - fc >= timedelta(minutes=10):
        return jsonify({"error": "Code expired. Request another."}), 400
    u.email_verificado = True
    u.codigo_verificacion = None
    u.fecha_codigo = None
    db.session.commit()
    token = create_jwt_token(u.id, u.username, u.es_admin)
    return jsonify({"token": token, "user": user_to_dict(u)})


@app.route("/api/auth/resend-email", methods=["POST"])
@require_auth
def resend_email(payload):
    from latinos_auth_utils import enviar_email_verificacion_mailgun_pets

    u = Usuario.query.get(payload["user_id"])
    if not u or not u.email or u.email_verificado:
        return jsonify({"error": "Nothing to resend."}), 400
    c = u.generar_codigo_verificacion_email()
    db.session.commit()
    if enviar_email_verificacion_mailgun_pets(u.email, c, u.nombre_completo):
        return jsonify({"ok": True})
    return jsonify({"error": "Could not send email."}), 500


@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("20 per minute")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400
    u = Usuario.query.filter_by(username=username).first()
    if not u or not u.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
    ensure_superadmin_users()
    u = Usuario.query.get(u.id)
    token = create_jwt_token(u.id, u.username, bool(u.es_admin))
    return jsonify({"token": token, "user": user_to_dict(u)})


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def me(payload):
    u = Usuario.query.get(payload["user_id"])
    if not u:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_to_dict(u))


# WhatsApp / Facebook / etc. fetch link previews without running JavaScript — use Open Graph HTML.
_DEFAULT_OG_IMAGE = (
    "https://images.unsplash.com/photo-1552053831-71594a27632d"
    "?w=1200&h=630&q=82&auto=format&fit=crop"
)

_SOCIAL_PREVIEW_UA_MARKERS = (
    "whatsapp",
    "facebookexternalhit",
    "facebot",
    "twitterbot",
    "linkedinbot",
    "slackbot",
    "telegrambot",
    "pinterest",
    "discordbot",
)


def _canonical_public_base_url() -> str:
    """Public site URL for OG tags, photo URLs, etc. Prefer WPA_PUBLIC_BASE_URL on Heroku."""
    fixed = (os.getenv("WPA_PUBLIC_BASE_URL") or os.getenv("PUBLIC_APP_URL") or "").strip().rstrip("/")
    if fixed:
        return fixed
    raw_proto = (
        request.headers.get("X-Forwarded-Proto")
        or request.scheme
        or "https"
    )
    proto = raw_proto.split(",")[0].strip().lower()
    if proto not in ("http", "https"):
        proto = "https"
    host = (request.headers.get("Host") or request.host or "").split(":")[0].strip().lower()
    if host == "waihekepetsalert.co.nz":
        host = "www.waihekepetsalert.co.nz"
    return f"{proto}://{host}".rstrip("/")


def _absolute_og_image_url(image_url: str | None, base: str) -> str:
    u = (image_url or "").strip()
    if not u:
        return _DEFAULT_OG_IMAGE
    if u.startswith("//"):
        return f"https:{u}"
    if u.startswith(("http://", "https://")):
        return u
    if u.startswith("/"):
        return f"{base}{u}"
    return f"{base}/{u}"


def _social_preview_bot_request() -> bool:
    ua = (request.headers.get("User-Agent") or "").lower()
    return any(m in ua for m in _SOCIAL_PREVIEW_UA_MARKERS)


def _truncate_og_description(text: str, limit: int = 260) -> str:
    t = (text or "").replace("\r", " ").replace("\n", " ").strip()
    if len(t) <= limit:
        return t
    return t[: limit - 1].rsplit(maxsplit=1)[0] + "…"


def _og_fields_for_alert(row: PetAlert, base: str) -> tuple[str, str, str, str]:
    name = (row.name or "").strip()
    if name:
        title_raw = f"{name} · {row.status} — Waiheke Pets Alert"
    else:
        title_raw = f"{row.status} pet — Waiheke Pets Alert"
    desc_raw = _truncate_og_description(
        (row.description or "").strip()
        or (row.location or "").strip()
        or "Lost and found pet alert on Waiheke Island."
    )
    img_url = (
        _absolute_og_image_url(row.image_url, base)
        if (row.image_url or "").strip()
        else _DEFAULT_OG_IMAGE
    )
    alt_raw = (row.image_alt or "").strip() or f"Photo · {row.name}"
    return title_raw, desc_raw, img_url, alt_raw


def _og_fields_for_home(base: str) -> tuple[str, str, str, str]:
    """Portal home link — fixed branding, not the latest gallery alert."""
    title_raw = (
        os.getenv("WPA_OG_HOME_TITLE") or "Waiheke Pets Alert"
    ).strip()
    desc_raw = (
        os.getenv("WPA_OG_HOME_DESCRIPTION")
        or "Helping families reunite with lost pets on Waiheke Island."
    ).strip()
    img_raw = (os.getenv("WPA_OG_HOME_IMAGE_URL") or _DEFAULT_OG_IMAGE).strip()
    img_url = _absolute_og_image_url(img_raw, base)
    alt_raw = "Waiheke Pets Alert — lost and found pets on Waiheke Island"
    return title_raw, desc_raw, img_url, alt_raw


def _alert_id_from_spa_path(path_within: str) -> str | None:
    parts = [p for p in (path_within or "").strip("/").split("/") if p]
    if len(parts) == 2 and parts[0].lower() == "alertas":
        aid = parts[1].strip()
        return aid or None
    return None


def _social_share_preview_html(*, canonical_url: str, title_raw: str, desc_raw: str, img_url: str, alt_raw: str) -> str:
    """Minimal HTML with Open Graph / Twitter tags for link previews (WhatsApp, Facebook, etc.)."""
    ti = escape(title_raw)
    ti_a = escape(title_raw, quote=True)
    de_a = escape(desc_raw, quote=True)
    im = escape(img_url, quote=True)
    al_a = escape(alt_raw, quote=True)
    cn = escape(canonical_url, quote=True)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{ti}</title>
  <meta name="description" content="{de_a}">
  <link rel="canonical" href="{cn}">
  <meta property="og:site_name" content="Waiheke Pets Alert">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_NZ">
  <meta property="og:title" content="{ti_a}">
  <meta property="og:description" content="{de_a}">
  <meta property="og:url" content="{cn}">
  <meta property="og:image" content="{im}">
  <meta property="og:image:secure_url" content="{im}">
  <meta property="og:image:alt" content="{al_a}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{ti_a}">
  <meta name="twitter:description" content="{de_a}">
  <meta name="twitter:image" content="{im}">
</head>
<body>
  <p><a href="{cn}">Open Waiheke Pets Alert</a></p>
</body>
</html>
"""


def _social_share_preview_for_path(path_within: str) -> str | None:
    """Build OG HTML for crawlers, or None if this path should use the normal SPA."""
    base = _canonical_public_base_url()
    aid = _alert_id_from_spa_path(path_within)
    if aid:
        row = PetAlert.query.get(aid)
        if not row:
            return None
        title_raw, desc_raw, img_url, alt_raw = _og_fields_for_alert(row, base)
        canonical = f"{base}/alertas/{aid}"
    elif path_within == "":
        title_raw, desc_raw, img_url, alt_raw = _og_fields_for_home(base)
        canonical = f"{base}/"
    else:
        return None
    return _social_share_preview_html(
        canonical_url=canonical,
        title_raw=title_raw,
        desc_raw=desc_raw,
        img_url=img_url,
        alt_raw=alt_raw,
    )


def _angular_browser_dir() -> str:
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(backend_dir, "..", "dist", "waiheke-pets-alert", "browser"))


def _serve_angular_asset(path_within: str):
    root_dir = _angular_browser_dir()
    index_path = os.path.join(root_dir, "index.html")
    if not os.path.isfile(index_path):
        msg = (
            "<!DOCTYPE html><html lang='en'><meta charset=utf-8><title>Frontend not built</title>"
            "<body style='font-family:system-ui;margin:2rem'>"
            "<h1>Angular bundle missing</h1>"
            "<p>Local: run <code>npm run build</code>. "
            "On Heroku run the Node build before starting Flask.</p>"
            "</body></html>"
        )
        return msg, 503, {"Content-Type": "text/html; charset=utf-8"}
    if path_within == "api" or path_within.startswith("api/"):
        abort(404)
    candidate = os.path.normpath(os.path.join(root_dir, path_within))
    if not candidate.startswith(root_dir + os.sep) and candidate != root_dir:
        abort(403)
    if path_within and os.path.isfile(candidate):
        return send_from_directory(os.path.dirname(candidate), os.path.basename(candidate))
    return send_from_directory(root_dir, "index.html")


@app.route("/", defaults={"path_within": ""}, methods=["GET"])
@app.route("/<path:path_within>", methods=["GET"])
def spa(path_within):
    """Serve Angular on the same host; /api/* has dedicated handlers declared above."""
    if request.method == "GET" and _social_preview_bot_request():
        html = _social_share_preview_for_path(path_within)
        if html:
            return html, 200, {"Content-Type": "text/html; charset=utf-8"}
    return _serve_angular_asset(path_within)


def _init():
    with app.app_context():
        db.create_all()
        migrate_usuario_auth_columns()
        migrate_sighting_comment_columns()
        migrate_registro_pendiente_otp_whatsapp()  # also ensures otp_email column
        seed_if_empty()
        migrate_demo_images_from_google()
        prune_configured_alert_posts()
        ensure_dev_user()
        ensure_superadmin_users()


_init()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_ENV") == "development")
