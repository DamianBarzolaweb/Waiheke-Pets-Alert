#!/usr/bin/env bash
# Siempre usa el venv del backend (evita "falta phonenumbers" al usar `python` del sistema).
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -x .venv/bin/python ]]; then
  echo "Creá el venv:  python3 -m venv .venv  &&  .venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi
exec .venv/bin/python app.py "$@"
