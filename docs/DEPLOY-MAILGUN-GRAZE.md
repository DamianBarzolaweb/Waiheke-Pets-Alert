# Mailgun con `grazewaiheke.co.nz` (Waiheke Pets Alert)

Compartís el dominio verificado de **Graze Waiheke** para enviar los códigos de registro de Pets Alert. La otra web (formulario → tu correo) **no se toca**: sigue usando las mismas rutas inbound en Mailgun.

## Qué ya está hecho en Heroku (`waihekepetsalert`)

```bash
MAILGUN_DOMAIN=grazewaiheke.co.nz
MAILGUN_FROM=Waiheke Pets Alert <noreply@grazewaiheke.co.nz>
```

## Lo que tenés que hacer vos (una vez)

El addon `mailgun:starter` de Heroku crea una **API key de sandbox** distinta de la cuenta donde tenés `grazewaiheke.co.nz`. Por eso puede aparecer **401 Forbidden** hasta que pongas la key correcta.

1. Entrá a [Mailgun](https://app.mailgun.com) con la cuenta donde figura **grazewaiheke.co.nz** (verificado ✓).
2. **Send** → **API keys** (o *Settings* → *API keys*) → copiá la **Private API key** (`key-…`).
3. En terminal:

```bash
heroku config:set MAILGUN_API_KEY="key-TU_CLAVE_PRIVADA" -a waihekepetsalert
```

4. Probá registro en https://waihekepetsalert.co.nz con un email real (ya no hace falta sandbox “authorized recipients”).

Opcional EU: si tu cuenta Mailgun es región EU:

```bash
heroku config:set MAILGUN_REGION=eu -a waihekepetsalert
```

## DNS

**No hace falta DNS nuevo** para Pets Alert si `grazewaiheke.co.nz` ya está verde en Mailgun (SPF, DKIM, etc. los configuraste para la otra web).

Solo si Mailgun te pide un registro nuevo al verificar, copiá exactamente lo que muestra el panel en **MyHost** → DNS de `grazewaiheke.co.nz`.

## Remitente

Los usuarios verán correos desde `noreply@grazewaiheke.co.nz` con asunto *Verify your account — Waiheke Pets Alert*. Si preferís otra dirección del mismo dominio (p. ej. `alertas@grazewaiheke.co.nz`), tiene que existir/estar permitida en Mailgun:

```bash
heroku config:set MAILGUN_FROM="Waiheke Pets Alert <alertas@grazewaiheke.co.nz>" -a waihekepetsalert
```

## Login

El **login** no usa Mailgun. Solo el **registro** (código de 6 dígitos).

## Rama

Trabajo de primer deploy en la rama git **`1er-deploy`**.
