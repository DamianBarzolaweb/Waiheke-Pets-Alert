#!/usr/bin/env bash
# Usa el dominio grazewaiheke.co.nz ya verificado en tu cuenta Mailgun (no el sandbox del addon).
set -euo pipefail
APP="${1:-waihekepetsalert}"

echo "Dominio y remitente en Heroku (${APP})…"
heroku config:set \
  MAILGUN_DOMAIN=grazewaiheke.co.nz \
  MAILGUN_FROM="Waiheke Pets Alert <noreply@grazewaiheke.co.nz>" \
  -a "$APP"

echo ""
echo "Pegá la Private API key de Mailgun (cuenta donde está grazewaiheke.co.nz, empieza con key-):"
read -r -s API_KEY
echo ""
heroku config:set "MAILGUN_API_KEY=${API_KEY}" -a "$APP"

echo ""
echo "Probando envío…"
heroku run 'python -c "
import os, sys
sys.path.insert(0, \"backend\")
from latinos_auth_utils import enviar_email_verificacion_mailgun_pets
ok = enviar_email_verificacion_mailgun_pets(\"damianbarzolaweb@gmail.com\", \"111111\", \"Test WPA\")
print(\"send_ok\", ok, \"domain\", os.getenv(\"MAILGUN_DOMAIN\"))
"' -a "$APP"
