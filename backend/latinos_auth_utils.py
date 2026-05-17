"""
Misma lógica que Waiheke Latinos: teléfono (phonenumbers), Twilio Verify, Mailgun.
"""
import os
import random

import requests


def validar_numero_whatsapp(numero: str):
    """
    Valida y formatea un número. Retorna (es_valido, e164, mensaje_error).
    """
    try:
        import phonenumbers
        from phonenumbers import NumberParseException
    except ImportError:
        print(
            "[ERROR] phonenumbers no instalado. Ej.: cd backend && .venv/bin/pip install -r requirements.txt",
            flush=True,
        )
        return (
            False,
            None,
            "Servidor incompleto: falta phonenumbers. En backend corré pip install -r requirements.txt usando el mismo Python del venv.",
        )

    if not numero or not numero.strip():
        return (False, None, "El número de teléfono es obligatorio para registrarse.")

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
                    "Número argentino inválido. Para móviles: +54 9 [código] [número].",
                )
            return (False, None, "Número no válido. Usa formato internacional (+64...).")

        nt = phonenumbers.number_type(parsed)
        if nt not in (
            phonenumbers.PhoneNumberType.MOBILE,
            phonenumbers.PhoneNumberType.FIXED_LINE_OR_MOBILE,
        ):
            if numero.startswith("+54"):
                return (False, None, "Solo móviles. Ej: +54 9 ...")
            return (False, None, "Solo se aceptan números móviles.")

        e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        return (True, e164, None)
    except NumberParseException:
        if numero and numero.startswith("+54"):
            return (False, None, "Formato incorrecto para Argentina. Usa +54 9 ...")
        return (False, None, "Formato de número incorrecto. Ej: +64 21 123 4567")
    except Exception as e:
        return (False, None, f"Error al validar: {e}")


def iniciar_verificacion_whatsapp(numero_e164: str, nombre: str) -> tuple[bool, str | None]:
    """
    Twilio Verify (WhatsApp) si hay credenciales; si no — o con DEV_SIMULATE_TWILIO=1 —
    simula OTP y devuelve el código en texto plano para guardarlo en BD (solo desarrollo).
    """
    force_sim = os.getenv("DEV_SIMULATE_TWILIO", "").lower() in ("1", "true", "yes")
    sid = os.getenv("TWILIO_ACCOUNT_SID") or ""
    token = os.getenv("TWILIO_AUTH_TOKEN") or ""
    vsid = os.getenv("TWILIO_VERIFY_SERVICE_SID") or ""
    configured = bool(sid.strip() and token.strip() and vsid.strip())

    if force_sim or not configured:
        code = generar_codigo_seis()
        nombre_s = nombre or "usuario"
        body = (
            f"Hola {nombre_s},\n"
            f"Tu código Waiheke Pets Alert: {code}\n"
            f"(mensaje simulado en servidor local — sin Twilio.)"
        )
        print("\n" + "=" * 60)
        print(f"[DEV WhatsApp simulado] número del formulario: {numero_e164}")
        print(body)
        print("=" * 60 + "\n")
        return True, code

    try:
        from twilio.rest import Client

        client = Client(sid.strip(), token.strip())
        client.verify.v2.services(vsid.strip()).verifications.create(
            to=numero_e164, channel="whatsapp"
        )
        return True, None
    except Exception as e:
        print(f"Error Twilio Verify: {e}")
        return False, None


def enviar_codigo_whatsapp_twilio(numero_e164: str, nombre: str) -> bool:
    """Compatibilidad — preferí iniciar_verificacion_whatsapp."""
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
            print(f"Error al verificar código Twilio: {e}")
            return False

    # Sin Twilio: código guardado al iniciar registro local, u otro código de 6 dígitos (modo laxo antiguo)
    if otp_esperado and codigo == otp_esperado.strip():
        return True
    print("[DEV] Twilio no configurado: código de 6 dígitos válido cualquiera.")
    return len(codigo) == 6 and codigo.isdigit()


def generar_codigo_seis() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(6))


def enviar_email_verificacion_mailgun_pets(email: str, codigo: str, nombre: str) -> bool:
    key = os.getenv("MAILGUN_API_KEY")
    domain = os.getenv("MAILGUN_DOMAIN")
    if not key or not domain:
        print(f"[DEV] Mailgun no configurado. Código email para {email}: {codigo}")
        return True
    try:
        url = f"https://api.mailgun.net/v3/{domain}/messages"
        data = {
            "from": f"Waiheke Pets Alert <noreply@{domain}>",
            "to": email,
            "subject": "Verifica tu cuenta - Waiheke Pets Alert",
            "text": f"Hola {nombre}, tu código es: {codigo} (válido 10 minutos).",
            "html": f"""
            <p>Hola {nombre},</p>
            <p>Tu código de verificación es: <strong style="font-size:24px;">{codigo}</strong></p>
            <p>Expira en 10 minutos.</p>
            """,
        }
        r = requests.post(url, auth=("api", key), data=data, timeout=20)
        return r.status_code == 200
    except Exception as e:
        print(f"Error Mailgun: {e}")
        return False
