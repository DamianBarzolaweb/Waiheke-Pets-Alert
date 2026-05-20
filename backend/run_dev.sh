#!/usr/bin/env bash
# Siempre usa el venv del backend (evita "falta phonenumbers" al usar `python` del sistema).
set -euo pipefail
cd "$(dirname "$0")"
# Local: registro con OTP por email (no pedir WhatsApp/Twilio). Para probar Verify: REGISTRATION_EMAIL_ONLY=0 npm run start:api
# Tiene prioridad sobre backend/.env porque python-dotenv no pisa variables ya definidas.
export REGISTRATION_EMAIL_ONLY="${REGISTRATION_EMAIL_ONLY:-1}"
if [[ ! -x .venv/bin/python ]]; then
  echo "Creá el venv:  python3 -m venv .venv  &&  .venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi
exec .venv/bin/python app.py "$@"
