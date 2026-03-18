"""AI Chat router – Clinical Decision Support endpoints with persistent chat history."""

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
    session_id: Optional[int] = None  # if set, history is loaded from DB


class AIChatResponse(BaseModel):
    reply: str
    risk_flags: List[dict] = []
    context_summary: str = ""
    session_id: Optional[int] = None


class RiskFlag(BaseModel):
    severity: str
    title: str
    message: str
    recommendation: str


class AIRiskScanResponse(BaseModel):
    patient_id: int
    flags: List[RiskFlag] = []


# ─── Session schemas ──────────────────────────────────────────────────────────


class SessionOut(BaseModel):
    id: int
    title: str
    patient_id: Optional[int]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class SessionCreateRequest(BaseModel):
    title: str = "New Session"
    patient_id: Optional[int] = None


class SessionRenameRequest(BaseModel):
    title: str


class MessageOut(BaseModel):
    id: int
    role: str
    text: str
    created_at: str

    class Config:
        from_attributes = True


# ─── Session Endpoints ────────────────────────────────────────────────────────


@router.get("/sessions", response_model=List[SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all chat sessions for the current user, newest first."""
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.updated_at.desc())
        .all()
    )
    return [
        SessionOut(
            id=s.id,
            title=s.title,
            patient_id=s.patient_id,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
        )
        for s in sessions
    ]


@router.post("/sessions", response_model=SessionOut)
def create_session(
    body: SessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new chat session."""
    session = models.ChatSession(
        user_id=current_user.id,
        patient_id=body.patient_id,
        title=body.title,
    )
    db.add(session)
    db.flush()

    # Add the default welcome message
    welcome = models.ChatMessage(
        session_id=session.id,
        role="assistant",
        text=(
            "Hello! I'm your **Vitalis AI Co-Pilot** powered by Mistral AI.\n\n"
            "Open a patient's profile to ask context-aware clinical questions, "
            "or ask me anything about general medical workflows.\n\n"
            "> ⚠️ **Disclaimer:** AI responses are for clinical support only and must "
            "always be verified by a licensed clinician. Never substitute AI advice for professional medical judgment."
        ),
    )
    db.add(welcome)
    db.commit()
    db.refresh(session)

    return SessionOut(
        id=session.id,
        title=session.title,
        patient_id=session.patient_id,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.patch("/sessions/{session_id}", response_model=SessionOut)
def rename_session(
    session_id: int,
    body: SessionRenameRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Rename an existing chat session."""
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = body.title.strip() or session.title
    db.commit()
    db.refresh(session)
    return SessionOut(
        id=session.id,
        title=session.title,
        patient_id=session.patient_id,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a chat session and all its messages."""
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}


@router.get("/sessions/{session_id}/messages", response_model=List[MessageOut])
def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch all messages for a session."""
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return [
        MessageOut(id=m.id, role=m.role, text=m.text, created_at=m.created_at.isoformat())
        for m in session.messages
    ]


# ─── Chat Endpoints ────────────────────────────────────────────────────────────


def _get_or_create_session(
    db: Session,
    user_id: int,
    session_id: Optional[int],
    patient_id: Optional[int],
) -> models.ChatSession:
    """Fetch existing session owned by user, or create a new one if session_id is None."""
    if session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == user_id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        return session

    # Auto-create a new session
    title = f"Patient #{patient_id} Chat" if patient_id else "General Chat"
    session = models.ChatSession(user_id=user_id, patient_id=patient_id, title=title)
    db.add(session)
    db.flush()
    return session


@router.post("/chat/{patient_id}", response_model=AIChatResponse)
def ai_chat_with_patient(
    patient_id: int,
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Patient-context-aware AI chat, with DB-backed persistent history."""

    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    session = _get_or_create_session(db, current_user.id, body.session_id, patient_id)

    # Load DB history for this session
    history = [
        {"role": m.role, "text": m.text}
        for m in session.messages
        if m.role in ("user", "assistant")
    ]

    result = ai_chat_service.chat_with_context(
        db=db,
        patient_id=patient_id,
        user_message=body.message,
        history=history,
    )

    # Persist user + assistant messages
    db.add(models.ChatMessage(session_id=session.id, role="user", text=body.message))
    db.add(models.ChatMessage(session_id=session.id, role="assistant", text=result["reply"]))
    db.commit()
    db.refresh(session)

    return AIChatResponse(
        reply=result["reply"],
        risk_flags=result.get("risk_flags", []),
        context_summary=result.get("context_summary", ""),
        session_id=session.id,
    )


@router.post("/chat", response_model=AIChatResponse)
def ai_chat_general(
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """General AI chat without patient context, with DB-backed persistent history."""

    session = _get_or_create_session(db, current_user.id, body.session_id, None)

    history = [
        {"role": m.role, "text": m.text}
        for m in session.messages
        if m.role in ("user", "assistant")
    ]

    result = ai_chat_service.chat_with_context(
        db=db,
        patient_id=None,
        user_message=body.message,
        history=history,
    )

    db.add(models.ChatMessage(session_id=session.id, role="user", text=body.message))
    db.add(models.ChatMessage(session_id=session.id, role="assistant", text=result["reply"]))
    db.commit()
    db.refresh(session)

    return AIChatResponse(
        reply=result["reply"],
        risk_flags=result.get("risk_flags", []),
        context_summary=result.get("context_summary", ""),
        session_id=session.id,
    )


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
