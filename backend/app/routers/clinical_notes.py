from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.audit import log_event
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/clinical-notes", tags=["Clinical Notes"])


def _draft_from_text(transcript: str) -> dict:
    text = (transcript or "").strip()
    if not text:
        text = "No transcript content available."

    return {
        "subjective": text,
        "objective": "Vitals and bedside findings to be reviewed.",
        "assessment": "Preliminary AI-assisted assessment. Clinician review required.",
        "plan": "Finalize treatment plan after clinician review.",
        "confidence": 0.55,
    }


@router.post("/patients/{patient_id}/draft-from-latest-audio", response_model=schemas.ClinicalNoteOut, status_code=201)
def create_draft_from_latest_audio(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor)
    ),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest_audio = (
        db.query(models.AudioNote)
        .filter(models.AudioNote.patient_id == patient_id)
        .order_by(models.AudioNote.created_at.desc())
        .first()
    )
    if not latest_audio:
        raise HTTPException(status_code=404, detail="No audio notes found for this patient")

    draft = _draft_from_text(latest_audio.transcript or "")
    note = models.ClinicalNote(
        patient_id=patient_id,
        authored_by=current_user.id,
        source_audio_note_id=latest_audio.id,
        status=models.ClinicalNoteStatus.draft,
        subjective=draft["subjective"],
        objective=draft["objective"],
        assessment=draft["assessment"],
        plan=draft["plan"],
        confidence=draft["confidence"],
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_event(
        db,
        action="clinical_note.draft_created",
        entity_type="clinical_note",
        entity_id=note.id,
        actor_user_id=current_user.id,
        patient_id=patient_id,
        details={"source_audio_note_id": latest_audio.id},
        commit=True,
    )

    return note


@router.get("/patients/{patient_id}", response_model=List[schemas.ClinicalNoteOut])
def list_patient_notes(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.ClinicalNote)
        .filter(models.ClinicalNote.patient_id == patient_id)
        .order_by(models.ClinicalNote.created_at.desc())
        .all()
    )


@router.patch("/{note_id}", response_model=schemas.ClinicalNoteOut)
def update_note(
    note_id: int,
    body: schemas.ClinicalNoteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor)
    ),
):
    note = db.query(models.ClinicalNote).filter(models.ClinicalNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(note, key, value)
    note.reviewed_by = current_user.id
    db.commit()
    db.refresh(note)

    log_event(
        db,
        action="clinical_note.updated",
        entity_type="clinical_note",
        entity_id=note.id,
        actor_user_id=current_user.id,
        patient_id=note.patient_id,
        details={"updated_fields": list(updates.keys())},
        commit=True,
    )

    return note


@router.post("/{note_id}/finalize", response_model=schemas.ClinicalNoteOut)
def finalize_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor)
    ),
):
    note = db.query(models.ClinicalNote).filter(models.ClinicalNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    note.status = models.ClinicalNoteStatus.finalized
    note.reviewed_by = current_user.id
    note.finalized_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(note)

    log_event(
        db,
        action="clinical_note.finalized",
        entity_type="clinical_note",
        entity_id=note.id,
        actor_user_id=current_user.id,
        patient_id=note.patient_id,
        commit=True,
    )

    return note
