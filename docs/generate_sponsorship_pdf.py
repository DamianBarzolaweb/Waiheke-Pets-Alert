#!/usr/bin/env python3
"""Generate docs/Sponsorship-Proposal-Waiheke-Pets-Alert.pdf

Run from repo root:
  .venv_pdf/bin/python docs/generate_sponsorship_pdf.py
"""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent / "Sponsorship-Proposal-Waiheke-Pets-Alert.pdf"


class ProposalPDF(FPDF):
    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(90, 90, 90)
        self.set_x(self.l_margin)
        half = (self.w - self.l_margin - self.r_margin) / 2
        self.cell(half, 8, "Confidential | Waiheke Pets Alert", align="L")
        self.cell(half, 8, f"Page {self.page_no()}", align="R")


def mcell(pdf: ProposalPDF, text: str, h: float = 5.5) -> None:
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, h, text)


def heading(pdf: ProposalPDF, text: str) -> None:
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(20, 20, 20)
    mcell(pdf, text, 6)
    pdf.ln(2)


def body(pdf: ProposalPDF, text: str) -> None:
    pdf.set_font("Helvetica", "", 10.5)
    pdf.set_text_color(35, 35, 35)
    mcell(pdf, text, 5.5)
    pdf.ln(1)


def bullet(pdf: ProposalPDF, items: list[str]) -> None:
    pdf.set_font("Helvetica", "", 10.5)
    pdf.set_text_color(35, 35, 35)
    for line in items:
        mcell(pdf, f"- {line}", 5.5)
    pdf.ln(2)


def main() -> None:
    pdf = ProposalPDF()
    pdf.set_margins(18, 18, 18)
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(15, 15, 15)
    mcell(pdf, "Sponsorship Proposal", 8)
    pdf.set_font("Helvetica", "", 11)
    mcell(pdf, "Waiheke Pets Alert", 6)
    pdf.ln(6)

    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(70, 70, 70)
    mcell(
        pdf,
        "Document classification: Commercial in confidence\n"
        "Jurisdiction: New Zealand\n"
        "Effective for sponsorship discussions unless superseded in writing.",
        5,
    )
    pdf.ln(5)

    heading(pdf, "1. Purpose")
    body(
        pdf,
        "This proposal invites veterinary clinics and pet retail businesses on Waiheke Island "
        "to sponsor Waiheke Pets Alert, a community digital platform for lost-and-found pet alerts "
        "with mapping and structured reporting. Sponsorship aligns your brand with animal welfare "
        "and neighbourhood resilience at the moment owners are most motivated to act.",
    )

    heading(pdf, "2. About Waiheke Pets Alert")
    body(
        pdf,
        "Waiheke Pets Alert consolidates time-critical information that is often scattered across "
        "social feeds. Registered users can publish and browse alerts, improving visibility for missing "
        "pets and accelerating reunification with families.",
    )

    heading(pdf, "3. Why sponsor")
    bullet(
        pdf,
        [
            "Highly relevant audience: pet guardians actively engaged during distress events.",
            "Positive brand association: practical community benefit with transparent sponsorship labelling.",
            "Digital presence: logo, short descriptor, and authorised contact link placed according to tier.",
            "Local relevance: messaging anchored to Waiheke Island households and visitors.",
        ],
    )

    heading(pdf, "4. Sponsorship tiers (1, 2, and 3)")
    body(
        pdf,
        "Three visibility packages are offered. Tier allocation reflects placement prominence and optional "
        "messaging rights. Premier placements may be capacity-limited to preserve layout quality and user trust.",
    )
    body(pdf, "Tier 1 - Community Supporter")
    bullet(
        pdf,
        [
            "Acknowledgement on the dedicated Sponsors section with small logo and organisation name.",
            "Single outbound link (website or preferred booking/contact URL).",
            "Standard rotation alongside other Tier 1 sponsors where applicable.",
        ],
    )
    body(pdf, "Tier 2 - Clinic Partner")
    bullet(
        pdf,
        [
            "All Tier 1 benefits.",
            "Medium logo treatment on high-traffic surfaces agreed in writing (for example, feed or directory sidebar).",
            "One short seasonal message per calendar quarter (subject to editorial fit and compliance).",
        ],
    )
    body(pdf, "Tier 3 - Premier Sponsor")
    bullet(
        pdf,
        [
            "All Tier 2 benefits.",
            "Premier placement (for example, persistent header strip or map-adjacent panel), subject to UX constraints.",
            "Priority scheduling for approved campaigns during mutually agreed windows.",
            "Named recognition in major release notes or community communications where issued.",
        ],
    )

    heading(pdf, "5. Investment (NZD)")
    body(
        pdf,
        "Fees are quoted in New Zealand dollars. Amounts exclude GST unless expressly stated otherwise; "
        "GST will be added where required under New Zealand tax rules.",
    )
    pdf.set_font("Helvetica", "B", 10.5)
    mcell(pdf, "Monthly option: NZD $100 per month, invoiced monthly.", 5.5)
    pdf.ln(1)
    mcell(
        pdf,
        "Annual option: NZD $1,000 per year, invoiced annually (preferential rate versus twelve monthly instalments).",
        5.5,
    )
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10.5)
    body(
        pdf,
        "Your selected tier determines the visibility package; the monthly or annual cadence above determines billing frequency. "
        "Written confirmation (email or signed schedule) will record tier, placement summary, and invoicing details.",
    )

    heading(pdf, "6. Compliance and brand use")
    bullet(
        pdf,
        [
            "Sponsorship will be labelled clearly so users understand commercial support.",
            "No clinical claims are implied by placement; sponsors remain responsible for their own advertising standards.",
            "Logo and trademark use require supplied brand assets and adherence to your brand guidelines where provided.",
        ],
    )

    heading(pdf, "7. Term and review")
    body(
        pdf,
        "Initial term and renewal (monthly or annual) will be confirmed in the sponsorship schedule. "
        "Either party may terminate for material breach subject to notice periods stated in that schedule. "
        "Ordinary cancellation for convenience should be agreed in writing with a reasonable notice window.",
    )

    heading(pdf, "8. Next steps")
    bullet(
        pdf,
        [
            "Confirm preferred tier (1, 2, or 3) and billing cadence (monthly NZD $100 or annual NZD $1,000).",
            "Provide vector or high-resolution logo and authorised organisation descriptor.",
            "Supply invoicing details and, if required, a purchase order reference.",
        ],
    )
    body(
        pdf,
        "Contact: [Your name] | [Email] | [Phone] | [Website URL]",
    )

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
