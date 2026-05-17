# Patrocinio / Sponsorship (referencia futura)

Documentación guardada para reutilizar la propuesta comercial hacia clínicas veterinarias y tiendas de mascotas (Waiheke, NZ).

## Archivos

| Qué | Ruta |
|-----|------|
| PDF formal (inglés, NZ) | `docs/Sponsorship-Proposal-Waiheke-Pets-Alert.pdf` |
| Generador del PDF | `docs/generate_sponsorship_pdf.py` |

## Precios acordados (NZD)

- **Mensual:** NZD **$100** / mes (facturación mensual).
- **Anual:** NZD **$1.000** / año (facturación anual; mejor tarifa que 12 × $100).

## Niveles (tiers)

1. **Tier 1 – Community Supporter:** sponsors / logo pequeño, enlace.
2. **Tier 2 – Clinic Partner:** Tier 1 + logo medio en zonas de alto tráfico + mensaje estacional breve (trimestral), sujeto a acuerdo.
3. **Tier 3 – Premier Sponsor:** Tier 2 + ubicación destacada (cabecera / junto al mapa según UX), prioridad en campañas acordadas, mención en comunicaciones relevantes.

El **tier** define el paquete de visibilidad; **mensual vs anual** define solo la cadencia de facturación (misma referencia de precio para los tres niveles en la propuesta actual).

## Regenerar el PDF

Desde la raíz del repo:

```bash
.venv_pdf/bin/python docs/generate_sponsorship_pdf.py
```

La primera vez, si no existe el entorno:

```bash
python3 -m venv .venv_pdf && .venv_pdf/bin/pip install fpdf2
```

## Pendiente antes de enviar

En `generate_sponsorship_pdf.py`, sustituir el bloque de contacto al final (placeholder `[Your name] | [Email] | ...`) por datos reales y volver a generar el PDF.

## Notas legales / NZ

- Texto orientado a propuesta **commercial in confidence**, jurisdicción NZ.
- Importes **excluyen GST salvo que se indique lo contrario**; GST según reglas aplicables en NZ.
