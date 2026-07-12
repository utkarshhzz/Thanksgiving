"""
app/api/v1/routers/ai.py
========================
AI-powered endpoints using Google Gemini API.

3 features:
  1. POST /ai/campaigns/improve      — Improve a campaign title + description
  2. POST /ai/campaigns/{id}/suggest — Get 3 similar campaign suggestions
  3. GET  /ai/users/me/impact        — Personalised impact summary for the user

All endpoints gracefully return a 503 if GEMINI_API_KEY is not set.
Uses google-generativeai SDK (pip install google-generativeai).
"""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.crowdfunding import Campaign, CampaignStatus
from app.models.donation import Donation
from app.models.volunteering import HourLog

router = APIRouter(prefix="/ai", tags=["AI Features"])


# ── Gemini client (lazy-loaded) ───────────────────────────────────────────────

def _gemini_model(model: str = "gemini-1.5-flash"):
    """Returns a configured Gemini GenerativeModel, or raises 503 if not configured."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI features are not configured. Add GEMINI_API_KEY to backend/.env "
                   "(get a free key at aistudio.google.com)."
        )
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return genai.GenerativeModel(model)
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="AI SDK not installed. Run: pip install google-generativeai"
        )


async def _ask_gemini(prompt: str) -> str:
    """Send a prompt to Gemini and return the text response. Runs in threadpool."""
    import asyncio
    model = _gemini_model()
    response = await asyncio.to_thread(model.generate_content, prompt)
    return response.text.strip()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ImproveRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None


class ImproveResponse(BaseModel):
    improved_title: str
    improved_description: str
    suggestions: list[str]   # 3 bullet points of what was improved


class SuggestResponse(BaseModel):
    suggestions: list[dict]   # [{title, reason}]


class ImpactSummary(BaseModel):
    summary: str             # 2-3 sentence personalised AI paragraph
    highlight: str           # one punchy headline stat


# ── Endpoint 1 — Improve campaign copy ───────────────────────────────────────

@router.post(
    "/campaigns/improve",
    response_model=ImproveResponse,
    summary="✨ AI-improve campaign title and description",
)
async def improve_campaign(
    data: ImproveRequest,
    _: User = Depends(get_current_active_user),
):
    """
    Takes a rough campaign title + description and returns a polished version.
    Used in NewCampaign.jsx — '✨ AI Improve' button.
    """
    category_hint = f"Category: {data.category}" if data.category else ""
    prompt = f"""You are a copywriter for a social-impact crowdfunding platform in India.

A user has drafted a campaign. Make it compelling, clear, and emotionally resonant.
Keep the improved description under 300 words. Use simple, warm language.

{category_hint}

ORIGINAL TITLE: {data.title}
ORIGINAL DESCRIPTION: {data.description}

Respond ONLY with valid JSON in this exact shape (no markdown, no extra text):
{{
  "improved_title": "...",
  "improved_description": "...",
  "suggestions": ["What changed 1", "What changed 2", "What changed 3"]
}}"""

    raw = await _ask_gemini(prompt)
    # Strip markdown code fences if present
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(raw)
        return ImproveResponse(**parsed)
    except Exception:
        raise HTTPException(status_code=500, detail="AI returned unexpected format. Try again.")


# ── Endpoint 2 — Similar campaign suggestions ─────────────────────────────────

@router.get(
    "/campaigns/{campaign_id}/suggest",
    response_model=SuggestResponse,
    summary="✨ AI-suggest similar campaigns the donor might like",
)
async def suggest_campaigns(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """
    After donating, suggest 3 other campaign ideas the platform should run.
    Uses the current campaign's title/description as context.
    Shown on CampaignDetail after a successful donation.
    """
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Also fetch a few active campaigns so AI can reference real ones
    result = await db.execute(
        select(Campaign)
        .where(Campaign.status == CampaignStatus.ACTIVE)
        .where(Campaign.id != campaign_id)
        .limit(5)
    )
    other_campaigns = result.scalars().all()
    others_text = "\n".join(
        f"- {c.title}" for c in other_campaigns
    ) or "None yet."

    prompt = f"""You are an assistant for a social-impact crowdfunding platform in India.

A user just donated to this campaign:
Title: {campaign.title}
Description: {campaign.description or '(no description)'}

Other active campaigns on the platform:
{others_text}

Suggest 3 other causes this person would likely care about. Be specific and inspiring.
Each suggestion should be a DIFFERENT category from the main campaign if possible.

Respond ONLY with valid JSON (no markdown):
{{
  "suggestions": [
    {{"title": "Campaign idea 1", "reason": "One sentence why this donor would care"}},
    {{"title": "Campaign idea 2", "reason": "..."}},
    {{"title": "Campaign idea 3", "reason": "..."}}
  ]
}}"""

    raw = await _ask_gemini(prompt)
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(raw)
        return SuggestResponse(**parsed)
    except Exception:
        raise HTTPException(status_code=500, detail="AI returned unexpected format. Try again.")


# ── Endpoint 3 — Personal impact summary ─────────────────────────────────────

@router.get(
    "/users/me/impact",
    response_model=ImpactSummary,
    summary="✨ AI-generated personal impact summary",
)
async def my_impact_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Generates a personalised 2-3 sentence impact summary for the user's Dashboard.
    Pulls their real donation count, total donated, and volunteer hours.
    """
    # Total donations + amount
    don_result = await db.execute(
        select(func.count(Donation.id), func.coalesce(func.sum(Donation.amount), 0))
        .where(Donation.donor_id == current_user.id)
    )
    don_count, don_total = don_result.one()

    # Total volunteer hours (verified)
    hrs_result = await db.execute(
        select(func.coalesce(func.sum(HourLog.hours_logged), 0))
        .where(HourLog.volunteer_id == current_user.id)
    )
    total_hours = float(hrs_result.scalar() or 0)

    name = (
        f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
        or "this user"
    )

    prompt = f"""You are writing a warm, encouraging impact summary for a social-good platform.

User: {name}
Donations made: {int(don_count)} campaigns supported
Total donated: ₹{float(don_total):,.0f}
Volunteer hours logged: {total_hours:.1f} hours

Write a 2-3 sentence personalised impact summary. Be specific, warm and inspiring.
End with a motivating call to keep going. Address the user directly as "you".

Also write one short punchy headline (max 8 words) celebrating their biggest achievement.

Respond ONLY with valid JSON (no markdown):
{{
  "summary": "...",
  "highlight": "..."
}}"""

    raw = await _ask_gemini(prompt)
    raw = raw.replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(raw)
        return ImpactSummary(**parsed)
    except Exception:
        raise HTTPException(status_code=500, detail="AI returned unexpected format. Try again.")
