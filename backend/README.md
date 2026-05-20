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

## Heroku (API + Angular en la misma app)

Dos buildpacks, en este orden: **Node construye Angular**, **Python ejecuta Flask + Gunicorn**.

```bash
heroku create tu-app-wpa   # ejemplo
heroku buildpacks:clear -a tu-app-wpa
heroku buildpacks:add heroku/nodejs -a tu-app-wpa
heroku buildpacks:add heroku/python -a tu-app-wpa
heroku addons:create heroku-postgresql:essential-0 -a tu-app-wpa
heroku config:set SECRET_KEY="$(openssl rand -hex 32)" JWT_SECRET_KEY="$(openssl rand -hex 32)" -a tu-app-wpa
git push heroku main
```

- En el slug, `npm install` corre primero y luego el script **`heroku-postbuild`** (`ng build`); los estáticos quedan en `dist/waiheke-pets-alert/browser/` y Flask los sirve en `/` junto con `/api/...`.
- **Misma URL Heroku**: no necesitás definir `window.__WPA_API_BASE__` (Angular llama rutas relativas `/api`).
- **`CORS_ORIGINS`**: opcional si los usuarios usan sólo ese dominio. Dejalo vacío o agrega orígenes extra si exponés otro dominio / app móvil.

Detalle Postgres (variables, Twilio): las tablas siguen arriba; `DATABASE_URL` la gestiona Heroku.


### Frontend en otro dominio (solo API en Heroku)

Si el Angular vive fuera del dyno:

```html
<script>window.__WPA_API_BASE__ = 'https://tu-api.herokuapp.com';</script>
```
y configurá **`CORS_ORIGINS`** en Heroku con el origen HTTPS exacto del front.

## Postgres y variables típicas (Heroku)

`requirements.txt` en la raíz referencia `backend/requirements.txt`. Heroku Postgres define **`DATABASE_URL`**; la app ajusta `postgres://` y SSL en dyno.

| Variable | Descripción |
|----------|-------------|
| `SECRET_KEY` | Cadena aleatoria larga |
| `JWT_SECRET_KEY` | Cadena aleatoria para JWT |
| `REGISTRATION_EMAIL_ONLY` | `1` por defecto: registro verificado con OTP por email (Mailgun recomendado). `0`: flujo anterior con Verify SMS/WhatsApp. |

### Registro de usuarios en producción

- **Por defecto (`REGISTRATION_EMAIL_ONLY=1` o sin definir):** email obligatorio; se envía un código de 6 dígitos vía Mailgun (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`). Sin Mailgun el código aparece en el log del servidor (solo desarrollo / diagnóstico). Teléfono opcional (no OTP).
  - Renovar código antes de completar la cuenta: `POST /api/auth/register/resend-email-code` con `registrationId`.
- **Opcional — mismo flujo Latinos/Twilio:** `REGISTRATION_EMAIL_ONLY=0` + **Twilio Verify** (OTP SMS/WhatsApp): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`; **`TWILIO_VERIFY_CHANNEL`** `sms` o `whatsapp`.
- **Solo demos:** `SKIP_WHATSAPP_OTP` + `ALLOW_SKIP_PHONE_OTP_IN_PRODUCTION` (solo aplica cuando el registro es por canal “phone”; con email-only casi siempre irrelevante).

Email en el flujo antiguo (phone first) seguía siendo opcional; con email-only forma parte de la verificación obligatoria.

## Rutas útiles

- `GET /api/auth/registration-options` — `{ "emailOnly": true|false }` (para ocultar el campo teléfono en el SPA).
- `GET /api/alerts` — listado JSON (camelCase)
- `GET /api/alerts/<id>`
- `POST /api/alerts` — crear reporte
- **Auth (como Waiheke Latinos, pero con JWT)**
  - `POST /api/auth/register/start` — datos + términos; con **email-only** devuelve `verificationChannel: "email"` y envía OTP al correo. Con `REGISTRATION_EMAIL_ONLY=0`, Twilio/WhatsApp salvo `SKIP_WHATSAPP_OTP=1` (en prod solo con `ALLOW_SKIP_PHONE_OTP_IN_PRODUCTION=1`; responde `skipPhoneOtp` y `verificationChannel: "phone"`).
  - `POST /api/auth/register/verify-phone` — `registrationId` + `code`: con email-only el código es el del email; con Twilio es el del SMS/WhatsApp (puede ir vacío si el servidor omitió OTP).
  - `POST /api/auth/register/resend-email-code` — solo flujo email-only: `{ "registrationId" }` (sin Bearer).
  - `POST /api/auth/verify-email` — `code` (Bearer) — paso extra solo en el flujo **phone first** si el usuario dejó email sin verificar.
  - `POST /api/auth/verify-email` — `code` (Bearer)
  - `POST /api/auth/resend-email` — Bearer
  - `POST /api/auth/login` — `{ "username", "password" }`
  - `GET /api/auth/me` — Bearer

La base de datos de **Pets Alert** es distinta a Latinos: hay que registrarse de nuevo en esta app (mismo flujo, otra BBDD).
