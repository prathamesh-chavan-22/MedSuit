"""AI Chat router – Clinical Decision Support endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_user
from app.database import get_db
from app.services import ai_chat_service

router = APIRouter(prefix="/ai", tags=["AI Clinical Support"])


# ─── Request / Response models ───────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    text: str


class AIChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class AIChatResponse(BaseModel):
    reply: str
    risk_flags: List[dict] = []
    context_summary: str = ""


class RiskFlag(BaseModel):
    severity: str
    title: str
    message: str
    recommendation: str


class AIRiskScanResponse(BaseModel):
    patient_id: int
    flags: List[RiskFlag] = []


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/chat/{patient_id}", response_model=AIChatResponse)
def ai_chat_with_patient(
    patient_id: int,
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Patient-context-aware AI chat. Sends the patient's full clinical
    timeline as context alongside the doctor's question to Mistral AI."""

    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    history = [{"role": m.role, "text": m.text} for m in body.history]

    result = ai_chat_service.chat_with_context(
        db=db,
        patient_id=patient_id,
        user_message=body.message,
        history=history,
    )

    return AIChatResponse(**result)


@router.post("/chat", response_model=AIChatResponse)
def ai_chat_general(
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """General AI chat without patient context."""

    history = [{"role": m.role, "text": m.text} for m in body.history]

    result = ai_chat_service.chat_with_context(
        db=db,
        patient_id=None,
        user_message=body.message,
        history=history,
    )

    return AIChatResponse(**result)


@router.post("/risk-scan/{patient_id}", response_model=AIRiskScanResponse)
def ai_risk_scan(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Proactively scan patient data for clinical risks using AI."""

    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    flags = ai_chat_service.run_risk_scan(db=db, patient_id=patient_id)

    return AIRiskScanResponse(
        patient_id=patient_id,
        flags=[RiskFlag(**f) for f in flags],
    )
