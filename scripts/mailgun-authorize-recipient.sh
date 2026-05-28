#!/usr/bin/env bash
# Invite a sandbox authorized recipient (Mailgun sends a verification link).
# Usage: ./scripts/mailgun-authorize-recipient.sh you@example.com [heroku-app]
set -euo pipefail
EMAIL="${1:?Usage: $0 email@example.com [heroku-app]}"
APP="${2:-waihekepetsalert}"
heroku run "python -c \"
import os, requests
email = '${EMAIL}'
key = os.environ['MAILGUN_API_KEY']
r = requests.post(
    f'https://api.mailgun.net/v5/sandbox/auth_recipients?email={email}',
    auth=('api', key),
    timeout=20,
)
print(r.status_code, r.text)
\"" -a "$APP"
