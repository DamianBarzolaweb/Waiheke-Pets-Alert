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

El front en desarrollo (`npm start`) usa un **proxy** hacia el Flask en el puerto 5001: las peticiones van a `http://localhost:4200/api/...` y el CLI las reenvía. Igual hace falta **tener el API en marcha** en otra terminal.

## Postgres (Heroku)

Añadí `DATABASE_URL` en el entorno y, si hace falta, `pip install -r requirements-heroku.txt` en el build (o runtime con una versión de Python que tenga wheel de `psycopg2-binary`).

## Rutas útiles

- `GET /api/health`
- `GET /api/alerts` — listado JSON (camelCase)
- `GET /api/alerts/<id>`
- `POST /api/alerts` — crear reporte
- **Auth (como Waiheke Latinos, pero con JWT)**
  - `POST /api/auth/register/start` — datos + términos; Twilio/WhatsApp salvo `SKIP_WHATSAPP_OTP=1` en `.env` con `FLASK_ENV=development` (responde `skipPhoneOtp` y no envía OTP).
  - `POST /api/auth/register/verify-phone` — `registrationId` + `code` (el código puede ir vacío si el servidor omitió OTP).
  - `POST /api/auth/verify-email` — `code` (Bearer)
  - `POST /api/auth/resend-email` — Bearer
  - `POST /api/auth/login` — `{ "username", "password" }`
  - `GET /api/auth/me` — Bearer

La base de datos de **Pets Alert** es distinta a Latinos: hay que registrarse de nuevo en esta app (mismo flujo, otra BBDD).
