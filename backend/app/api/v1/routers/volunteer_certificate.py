"""
app/api/v1/routers/volunteer_certificate.py
==============================================
Generate a volunteer certificate PDF for a user's completed volunteer work.

  GET /users/me/volunteer-certificate?org_id=<uuid>   - download certificate PDF
  GET /users/me/volunteer-stats                        - summary of hours by org
"""
import uuid
import io
from datetime import datetime, date

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_active_user
from app.models.user import User

router = APIRouter(tags=["Volunteer Certificate"])


async def _get_volunteer_stats(user_id: uuid.UUID, db: AsyncSession, org_id: uuid.UUID | None = None):
    """Fetch total approved hours and list of orgs volunteered for."""
    from app.models.volunteering import VolunteerHourLog, Application, Opportunity
    from app.models.organization import Organization

    query = (
        select(
            func.sum(VolunteerHourLog.hours_logged).label("total_hours"),
            func.count(VolunteerHourLog.id).label("sessions"),
            Organization.name.label("org_name"),
        )
        .join(Application, VolunteerHourLog.application_id == Application.id)
        .join(Opportunity, Application.opportunity_id == Opportunity.id)
        .join(Organization, Opportunity.organization_id == Organization.id)
        .where(Application.user_id == user_id)
        .where(VolunteerHourLog.status == "approved")
        .group_by(Organization.name)
    )
    if org_id:
        query = query.where(Opportunity.organization_id == org_id)

    result = await db.execute(query)
    return result.all()


@router.get("/users/me/volunteer-stats", summary="Summary of volunteer hours by organization")
async def volunteer_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    rows = await _get_volunteer_stats(current_user.id, db)
    total = sum(float(r.total_hours or 0) for r in rows)
    return {
        "total_hours": total,
        "organizations": [
            {"org_name": r.org_name, "hours": float(r.total_hours or 0), "sessions": r.sessions}
            for r in rows
        ],
    }


@router.get("/users/me/volunteer-certificate", summary="Download volunteer certificate PDF")
async def volunteer_certificate(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generates a simple, professional PDF certificate listing the volunteer's
    name, total approved hours, and the organizations they served.
    Uses reportlab if available, falls back to plain-text PDF if not.
    """
    rows = await _get_volunteer_stats(current_user.id, db)
    total_hours = sum(float(r.total_hours or 0) for r in rows)
    org_list = [(r.org_name, float(r.total_hours or 0)) for r in rows]

    name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email.split("@")[0]
    today_str = date.today().strftime("%B %d, %Y")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                topMargin=2*cm, bottomMargin=2*cm,
                                leftMargin=2.5*cm, rightMargin=2.5*cm)
        styles = getSampleStyleSheet()
        purple = colors.HexColor('#7c3aed')
        light_purple = colors.HexColor('#ede9fe')

        title_style = ParagraphStyle('title', fontSize=28, textColor=purple, alignment=TA_CENTER,
                                      fontName='Helvetica-Bold', spaceAfter=6)
        sub_style   = ParagraphStyle('sub',   fontSize=13, textColor=colors.HexColor('#6b7280'),
                                      alignment=TA_CENTER, spaceAfter=4)
        name_style  = ParagraphStyle('name',  fontSize=22, textColor=colors.HexColor('#1e1b4b'),
                                      alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=4)
        body_style  = ParagraphStyle('body',  fontSize=11, textColor=colors.HexColor('#374151'),
                                      alignment=TA_CENTER, spaceAfter=4, leading=16)

        story = [
            Spacer(1, 0.5*cm),
            Paragraph("🤝 ThankGiving", title_style),
            Paragraph("Certificate of Volunteer Service", sub_style),
            HRFlowable(width="100%", thickness=2, color=purple, spaceAfter=12),
            Spacer(1, 0.5*cm),
            Paragraph("This is to certify that", body_style),
            Spacer(1, 0.2*cm),
            Paragraph(name, name_style),
            Spacer(1, 0.3*cm),
            Paragraph(
                f"has completed a total of <b>{total_hours:.1f} volunteer hours</b> "
                f"through the ThankGiving platform as of {today_str}.",
                body_style
            ),
            Spacer(1, 0.8*cm),
        ]

        if org_list:
            story.append(Paragraph("Organizations Served", ParagraphStyle('h3', fontSize=13, fontName='Helvetica-Bold',
                                    textColor=purple, alignment=TA_CENTER, spaceAfter=8)))
            table_data = [["Organization", "Hours"]] + [[o[0], f"{o[1]:.1f} hrs"] for o in org_list]
            t = Table(table_data, colWidths=[11*cm, 4*cm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), purple),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 11),
                ('ALIGN', (1,0), (1,-1), 'CENTER'),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, light_purple]),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#d1d5db')),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(t)

        story += [
            Spacer(1, 1.5*cm),
            HRFlowable(width="60%", thickness=1, color=colors.HexColor('#d1d5db')),
            Spacer(1, 0.3*cm),
            Paragraph("ThankGiving Platform", ParagraphStyle('footer', fontSize=10, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)),
            Paragraph(f"Issued: {today_str}", ParagraphStyle('footer2', fontSize=9, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER)),
        ]

        doc.build(story)
        pdf_bytes = buffer.getvalue()

    except ImportError:
        # Fallback: minimal PDF without reportlab
        pdf_bytes = _minimal_pdf(name, total_hours, org_list, today_str)

    filename = f"ThankGiving_Certificate_{name.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _minimal_pdf(name: str, total_hours: float, orgs: list, date_str: str) -> bytes:
    """Ultra-minimal valid PDF without external dependencies."""
    lines = [
        f"ThankGiving Certificate of Volunteer Service",
        f"",
        f"This certifies that {name}",
        f"has completed {total_hours:.1f} volunteer hours through ThankGiving.",
        f"",
    ]
    for o_name, o_hours in orgs:
        lines.append(f"  {o_name}: {o_hours:.1f} hrs")
    lines += ["", f"Issued: {date_str}"]
    content = "\n".join(lines)

    # Build a valid minimal PDF
    stream = content.encode("latin-1", errors="replace")
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n"
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n"
    )
    txt_lines = "\n".join(
        f"BT /F1 11 Tf 72 {720 - i*16} Td ({ln}) Tj ET"
        for i, ln in enumerate(lines[:40])
    ).encode()
    stream_part = b"<< /Length " + str(len(txt_lines)).encode() + b" >>\nstream\n" + txt_lines + b"\nendstream\nendobj\n"
    font = (
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f\r\n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n9\n%%EOF"
    )
    return pdf + stream_part + font
