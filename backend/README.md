# API (Flask, estilo Latinos)

## Entorno local

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # editar SECRET_KEY y JWT_SECRET_KEY
# Opcional: usuario de prueba JWT
# export DEV_USERNAME=admin DEV_PASSWORD=tu_clave
python app.py          # http://127.0.0.1:5001 — SQLite: waiheke_pets.db
```

Desde la **raíz del repo**, `npm start` levanta **API + Angular** (`concurrently`): el proxy (`proxy.conf.json`) reenvía `http://localhost:4200/api/...` a Flask en `:5001`. Solo el front: `npm run start:web`.

## Postgres (Heroku)

El build de Heroku usa `requirements.txt` en la **raíz del repositorio** (incluye `backend/requirements.txt` vía `-r`). Añade el addon Postgres y configurá (`heroku config:set`):

| Variable | Descripción |
|----------|-------------|
| `SECRET_KEY` | Cadena aleatoria larga |
| `JWT_SECRET_KEY` | Cadena aleatoria para JWT |
| `CORS_ORIGINS` | URLs del front (HTTPS), separadas por coma. Ej.: `https://tu-app.netlify.app` |

Heroku define `DATABASE_URL` automáticamente; la app reescribe `postgres://` → `postgresql://`.

### Registro de usuarios en producción

- **Twilio Verify** (OTP al teléfono): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`. Variable opcional **`TWILIO_VERIFY_CHANNEL`**: valor `sms` (recomendado para empezar / cuenta trial sin WhatsApp Business) o `whatsapp` (requiere cuenta WABA enlazada a Verify; ver [Twilio Verify + WhatsApp](https://www.twilio.com/docs/verify/whatsapp)).
- **Solo demos:** `SKIP_WHATSAPP_OTP=1` y `ALLOW_SKIP_PHONE_OTP_IN_PRODUCTION=1` — se salta WhatsApp (**no usar** con datos reales).

Email opcional: `MAILGUN_API_KEY` y `MAILGUN_DOMAIN`.

### Frontend (Angular) apuntando al API

Tras `ng build`, en el `index.html` generado (o en `src/index.html` antes de compilar) definí antes de `<app-root>`:

```html
<script>window.__WPA_API_BASE__ = 'https://tu-api.herokuapp.com';</script>
```

### Crear la app desde la raíz del repo

```bash
heroku create tu-api-wpa
heroku addons:create heroku-postgresql:essential-0
heroku config:set SECRET_KEY="$(openssl rand -hex 32)" JWT_SECRET_KEY="$(openssl rand -hex 32)"
heroku config:set CORS_ORIGINS="https://donde-esta-el-frontend.com"
git push heroku main
```

## Rutas útiles

- `GET /api/health`
- `GET /api/alerts` — listado JSON (camelCase)
- `GET /api/alerts/<id>`
- `POST /api/alerts` — crear reporte
- **Auth (como Waiheke Latinos, pero con JWT)**
  - `POST /api/auth/register/start` — datos + términos; Twilio/WhatsApp salvo `SKIP_WHATSAPP_OTP=1` (en prod solo con `ALLOW_SKIP_PHONE_OTP_IN_PRODUCTION=1`; responde `skipPhoneOtp`).
  - `POST /api/auth/register/verify-phone` — `registrationId` + `code` (el código puede ir vacío si el servidor omitió OTP).
  - `POST /api/auth/verify-email` — `code` (Bearer)
  - `POST /api/auth/resend-email` — Bearer
  - `POST /api/auth/login` — `{ "username", "password" }`
  - `GET /api/auth/me` — Bearer

La base de datos de **Pets Alert** es distinta a Latinos: hay que registrarse de nuevo en esta app (mismo flujo, otra BBDD).
