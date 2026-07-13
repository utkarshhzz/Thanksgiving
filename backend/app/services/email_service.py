"""
email_service.py
================
Sends transactional emails via Resend (resend.com — free 100/day).

Setup:
  1. Sign up at resend.com
  2. Create an API key
  3. Add to backend/.env:
       RESEND_API_KEY=re_xxxxxxxxxxxx
  4. pip install resend (already in requirements if you ran pip install)

If RESEND_API_KEY is empty, all email functions are no-ops (safe for dev).
"""
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_resend():
    """Lazy-load resend only when actually needed. Returns None if not configured."""
    if not settings.RESEND_API_KEY:
        return None
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        return resend
    except ImportError:
        logger.warning("resend package not installed. Run: pip install resend")
        return None


async def send_donation_notification(
    org_email: str,
    org_name: str,
    donor_name: str,
    amount: float,
    campaign_title: str,
    campaign_url: str,
) -> None:
    """
    Email the organization when someone donates to their campaign.
    Safe no-op if email is not configured.
    """
    resend = _get_resend()
    if not resend:
        logger.info(f"[Email skipped] Donation ₹{amount:.0f} to '{campaign_title}' — email not configured")
        return

    try:
        resend.Emails.send({
            "from": "ThankGiving <noreply@thanksgiving.app>",
            "to": org_email,
            "subject": f"💜 New ₹{amount:,.0f} donation to '{campaign_title}'",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; color: #e2e8f0; padding: 32px; border-radius: 16px;">
              <h2 style="color: #a78bfa; font-size: 24px; margin-bottom: 8px;">New Donation Received! 🎉</h2>
              <p>Hi <strong>{org_name}</strong>,</p>
              <p style="font-size: 18px;">
                <strong style="color: #a78bfa;">{donor_name}</strong> just donated
                <strong style="color: #f59e0b; font-size: 22px;">₹{amount:,.0f}</strong>
                to your campaign <strong>"{campaign_title}"</strong>.
              </p>
              <a href="{campaign_url}" style="
                display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa);
                color: white; padding: 14px 28px; border-radius: 10px;
                text-decoration: none; font-weight: 700; margin-top: 16px;
              ">View Campaign →</a>
              <p style="color: #64748b; margin-top: 32px; font-size: 13px;">
                ThankGiving — connecting causes with communities.
              </p>
            </div>
            """,
        })
        logger.info(f"Donation email sent to {org_email} for ₹{amount:.0f}")
    except Exception as e:
        logger.error(f"Failed to send donation email: {e}")


async def send_donation_confirmation(
    donor_email: str,
    donor_name: str,
    campaign_title: str,
    amount: float,
    campaign_url: str,
) -> None:
    """
    Confirmation email to the DONOR after a successful donation.
    Safe no-op if email is not configured.
    """
    resend = _get_resend()
    if not resend:
        logger.info(f"[Email skipped] Donor confirmation ₹{amount:.0f} to '{campaign_title}' — not configured")
        return

    try:
        resend.Emails.send({
            "from": "ThankGiving <noreply@thanksgiving.app>",
            "to": donor_email,
            "subject": f"✅ Your ₹{amount:,.0f} donation to '{campaign_title}' is confirmed",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; color: #e2e8f0; padding: 32px; border-radius: 16px;">
              <h2 style="color: #a78bfa; font-size: 24px; margin-bottom: 8px;">Thank you, {donor_name}! 💜</h2>
              <p>Your donation has been successfully recorded.</p>
              <div style="background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.3); border-radius: 12px; padding: 20px; margin: 20px 0;">
                <div style="font-size: 14px; color: #94a3b8; margin-bottom: 4px;">Donation Amount</div>
                <div style="font-size: 32px; font-weight: 900; color: #a78bfa;">₹{amount:,.0f}</div>
                <div style="font-size: 14px; color: #94a3b8; margin-top: 8px;">Campaign: <strong style="color: #e2e8f0;">{campaign_title}</strong></div>
              </div>
              <p style="color: #94a3b8; font-size: 14px;">
                Your generosity makes real change happen. You can download your receipt from the
                <a href="{campaign_url}" style="color: #a78bfa;">My Donations</a> page.
              </p>
              <a href="{campaign_url}" style="
                display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa);
                color: white; padding: 14px 28px; border-radius: 10px;
                text-decoration: none; font-weight: 700; margin-top: 16px;
              ">View Campaign →</a>
              <p style="color: #64748b; margin-top: 32px; font-size: 13px;">
                ThankGiving — connecting causes with communities.
              </p>
            </div>
            """,
        })
        logger.info(f"Donation confirmation email sent to {donor_email}")
    except Exception as e:
        logger.error(f"Failed to send donation confirmation email: {e}")


async def send_application_status_email(
    volunteer_email: str,
    volunteer_name: str,
    opportunity_title: str,
    status: str,   # "approved" or "rejected"
    org_name: str,
) -> None:
    """
    Email the volunteer when their application is approved or rejected.
    Safe no-op if email is not configured.
    """
    resend = _get_resend()
    if not resend:
        logger.info(f"[Email skipped] Application {status} for '{opportunity_title}' — email not configured")
        return

    approved = status == "approved"
    color = "#10b981" if approved else "#ef4444"
    heading = "Application Approved! 🎉" if approved else "Application Update"
    body_text = (
        "Great news! You've been approved. The organization will contact you with next steps."
        if approved else
        "Thank you for applying. Unfortunately this opportunity isn't a match right now — keep exploring!"
    )

    try:
        resend.Emails.send({
            "from": "ThankGiving <noreply@thanksgiving.app>",
            "to": volunteer_email,
            "subject": f"{'✅ Application Approved' if approved else '❌ Application Update'} — {opportunity_title}",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; color: #e2e8f0; padding: 32px; border-radius: 16px;">
              <h2 style="color: {color}; font-size: 24px;">{heading}</h2>
              <p>Hi <strong>{volunteer_name}</strong>,</p>
              <p>Your application to <strong>"{opportunity_title}"</strong>
                 by <strong>{org_name}</strong> has been reviewed.</p>
              <p style="background: {color}22; border: 1px solid {color}44; border-radius: 10px; padding: 16px; color: {color};">
                {body_text}
              </p>
              <a href="https://thanksgiving.app/volunteer" style="
                display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa);
                color: white; padding: 14px 28px; border-radius: 10px;
                text-decoration: none; font-weight: 700; margin-top: 16px;
              ">Browse Opportunities →</a>
            </div>
            """,
        })
        logger.info(f"Application status email sent to {volunteer_email} (status={status})")
    except Exception as e:
        logger.error(f"Failed to send application status email: {e}")


async def send_welcome_email(
    user_email: str,
    user_name: str,
) -> None:
    """
    Welcome email sent after registration.
    Safe no-op if email is not configured.
    """
    resend = _get_resend()
    if not resend:
        return

    try:
        resend.Emails.send({
            "from": "ThankGiving <noreply@thanksgiving.app>",
            "to": user_email,
            "subject": "Welcome to ThankGiving! 💜",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f23; color: #e2e8f0; padding: 32px; border-radius: 16px;">
              <h1 style="color: #a78bfa;">Welcome, {user_name}! 🎉</h1>
              <p>You've joined a community of people making real change happen.</p>
              <p>Here's what you can do on ThankGiving:</p>
              <ul style="color: #94a3b8; line-height: 2;">
                <li>💰 Donate to campaigns that matter to you</li>
                <li>🙋 Volunteer your time and skills</li>
                <li>📦 Donate goods to organizations in need</li>
                <li>🏢 Offer your spaces for events and causes</li>
              </ul>
              <a href="https://thanksgiving.app/campaigns" style="
                display: inline-block; background: linear-gradient(135deg, #7c3aed, #a78bfa);
                color: white; padding: 14px 28px; border-radius: 10px;
                text-decoration: none; font-weight: 700; margin-top: 16px;
              ">Explore Campaigns →</a>
            </div>
            """,
        })
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
