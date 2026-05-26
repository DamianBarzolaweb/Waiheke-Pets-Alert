"""
Phone validation (phonenumbers), Twilio Verify, Mailgun — shared pattern with Latinos-style auth.
"""
import os
import random

import requests


def validar_numero_whatsapp(numero: str):
    """
    Validate and normalize a mobile number.
    Returns (is_valid, e164_or_none, error_message_or_none).
    """
    try:
        import phonenumbers
        from phonenumbers import NumberParseException
    except ImportError:
        print(
            "[ERROR] phonenumbers missing. e.g.: cd backend && .venv/bin/pip install -r requirements.txt",
            flush=True,
        )
        return (
            False,
            None,
            "Server misconfigured: install phonenumbers in the backend venv.",
        )

    if not numero or not numero.strip():
        return (False, None, "A mobile phone number is required to sign up.")

    try:
        numero = numero.strip().replace(" ", "")
        if numero.startswith("00"):
            numero = "+" + numero[2:]
        if not numero.startswith("+"):
            numero = "+64" + numero.lstrip("0")

        if numero.startswith("+54") and len(numero) > 3 and numero[3] != "9":
            numero_con_9 = "+549" + numero[3:]
            try:
                parsed_con_9 = phonenumbers.parse(numero_con_9, None)
                if phonenumbers.is_valid_number(parsed_con_9):
                    nt = phonenumbers.number_type(parsed_con_9)
                    if nt in (
                        phonenumbers.PhoneNumberType.MOBILE,
                        phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE,
                    ):
                        numero = numero_con_9
            except Exception:
                pass

        parsed = phonenumbers.parse(numero, None)
        if not phonenumbers.is_valid_number(parsed):
            if numero.startswith("+54"):
                return (
                    False,
                    None,
                    "Invalid Argentina number. For mobiles use +54 9 [area] [number].",
                )
            return (False, None, "Invalid number. Use international format (e.g. +64 …).")

        nt = phonenumbers.number_type(parsed)
        if nt not in (
            phonenumbers.PhoneNumberType.MOBILE,
            phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE,
        ):
            if numero.startswith("+54"):
                return (False, None, "Mobile numbers only (e.g. +54 9 …).")
            return (False, None, "Only mobile numbers are accepted.")

        e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        return (True, e164, None)
    except NumberParseException:
        if numero and numero.startswith("+54"):
            return (False, None, "Wrong format for Argentina. Use +54 9 …")
        return (False, None, "Invalid phone format (e.g. +64 21 123 4567).")
    except Exception as e:
        return (False, None, f"Validation error: {e}")


def iniciar_verificacion_whatsapp(numero_e164: str, nombre: str) -> tuple[bool, str | None]:
    """
    Twilio Verify (SMS/WhatsApp) when credentials are set; otherwise — or if DEV_SIMULATE_TWILIO=1 —
    simulate OTP for local dev (code printed/stored plainly).
    """
    force_sim = os.getenv("DEV_SIMULATE_TWILIO", "").lower() in ("1", "true", "yes")
    sid = os.getenv("TWILIO_ACCOUNT_SID") or ""
    token = os.getenv("TWILIO_AUTH_TOKEN") or ""
    vsid = os.getenv("TWILIO_VERIFY_SERVICE_SID") or ""
    configured = bool(sid.strip() and token.strip() and vsid.strip())

    if force_sim or not configured:
        code = generar_codigo_seis()
        nombre_s = nombre or "friend"
        body = (
            f"Hi {nombre_s},\n"
            f"Your Waiheke Pets Alert code: {code}\n"
            f"(simulated locally — Twilio not used.)"
        )
        print("\n" + "=" * 60)
        print(f"[DEV simulated OTP] submitted number: {numero_e164}")
        print(body)
        print("=" * 60 + "\n")
        return True, code

    try:
        from twilio.rest import Client

        client = Client(sid.strip(), token.strip())
        channel = (
            os.getenv("TWILIO_VERIFY_CHANNEL") or os.getenv("TWILIO_VERIFY_DEFAULT_CHANNEL") or "whatsapp"
        ).strip().lower()
        if channel not in ("whatsapp", "sms"):
            channel = "whatsapp"
        client.verify.v2.services(vsid.strip()).verifications.create(
            to=numero_e164, channel=channel
        )
        return True, None
    except Exception as e:
        print(f"Twilio Verify error: {e}")
        return False, None


def enviar_codigo_whatsapp_twilio(numero_e164: str, nombre: str) -> bool:
    """Legacy — prefer iniciar_verificacion_whatsapp."""
    ok, _ = iniciar_verificacion_whatsapp(numero_e164, nombre)
    return ok


def verificar_codigo_twilio(
    numero_e164: str, codigo: str, otp_esperado: str | None = None
) -> bool:
    if not (numero_e164 and codigo):
        return False
    codigo = codigo.strip()
    sid = os.getenv("TWILIO_ACCOUNT_SID") or ""
    token = os.getenv("TWILIO_AUTH_TOKEN") or ""
    vsid = os.getenv("TWILIO_VERIFY_SERVICE_SID") or ""
    configured = bool(sid.strip() and token.strip() and vsid.strip())

    if configured:
        try:
            from twilio.rest import Client

            client = Client(sid.strip(), token.strip())
            r = client.verify.v2.services(vsid.strip()).verification_checks.create(
                to=numero_e164, code=codigo
            )
            return r.status == "approved"
        except Exception as e:
            print(f"Twilio verify check error: {e}")
            return False

    if otp_esperado and codigo == otp_esperado.strip():
        return True
    print("[DEV] Twilio not configured: any 6-digit code is accepted.")
    return len(codigo) == 6 and codigo.isdigit()


def generar_codigo_seis() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(6))


def enviar_email_verificacion_mailgun_pets(email: str, codigo: str, nombre: str) -> bool:
    key = (os.getenv("MAILGUN_API_KEY") or "").strip()
    domain = (os.getenv("MAILGUN_DOMAIN") or "").strip()
    flask_env = (os.getenv("FLASK_ENV") or "").strip().lower()
    dev_mode = flask_env == "development"

    if not key or not domain:
        if dev_mode:
            print(f"[DEV] Mailgun not configured. Email code for {email}: {codigo}")
            return True
        print("[Mailgun] Set MAILGUN_API_KEY and MAILGUN_DOMAIN to send verification emails.")
        return False

    region = (os.getenv("MAILGUN_REGION") or "").strip().lower()
    base = (
        "https://api.eu.mailgun.net/v3"
        if region in ("eu", "europe")
        else "https://api.mailgun.net/v3"
    )
    from_addr = (
        os.getenv("MAILGUN_FROM")
        or f"Waiheke Pets Alert <noreply@{domain}>"
    ).strip()

    try:
        url = f"{base}/{domain}/messages"
        data = {
            "from": from_addr,
            "to": email,
            "subject": "Verify your account — Waiheke Pets Alert",
            "text": f"Hi {nombre}, your code is: {codigo} (valid 10 minutes).",
            "html": f"""
            <p>Hi {nombre},</p>
            <p>Your verification code is: <strong style="font-size:24px;">{codigo}</strong></p>
            <p>Expires in 10 minutes.</p>
            """,
        }
        r = requests.post(url, auth=("api", key), data=data, timeout=20)
        if r.status_code != 200:
            print(f"Mailgun HTTP {r.status_code}: {r.text[:500]}")
        return r.status_code == 200
    except Exception as e:
        print(f"Mailgun error: {e}")
        return False
