import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.audit import log_event
from app.auth import get_current_user, require_role
from app.consent import has_active_consent
from app.database import get_db

router = APIRouter(prefix="/audio", tags=["Audio Notes"])

UPLOAD_DIR = "uploads/audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def transcribe_with_google(file_path: str) -> str:
    """Send audio to Google Speech-to-Text and return transcript."""
    try:
        from google.cloud import speech
        client = speech.SpeechClient()

        with open(file_path, "rb") as f:
            content = f.read()

        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="en-US",
            enable_automatic_punctuation=True,
        )
        response = client.recognize(config=config, audio=audio)
        return " ".join(r.alternatives[0].transcript for r in response.results)
    except Exception as exc:
        # Fallback: return placeholder so dev can continue without credentials
        return f"[Transcription failed: {exc}]"


@router.post("/{patient_id}", response_model=schemas.AudioNoteOut, status_code=201)
async def upload_audio(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if not has_active_consent(db, patient_id):
        log_event(
            db,
            action="audio.upload_blocked_no_consent",
            entity_type="audio_note",
            actor_user_id=current_user.id,
            patient_id=patient_id,
            commit=True,
        )
        raise HTTPException(status_code=403, detail="Active consent is required for audio upload")

    # Save file
    ext = os.path.splitext(file.filename)[-1] or ".webm"
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(file_path, "wb") as out:
        content = await file.read()
        await out.write(content)

    # Transcribe
    transcript = await transcribe_with_google(file_path)

    note = models.AudioNote(
        patient_id=patient_id,
        recorded_by=current_user.id,
        audio_file_path=file_path,
        transcript=transcript,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_event(
        db,
        action="audio.uploaded",
        entity_type="audio_note",
        entity_id=note.id,
        actor_user_id=current_user.id,
        patient_id=patient_id,
        details={"file_path": file_path},
        commit=True,
    )

    return note


@router.get("/{patient_id}", response_model=List[schemas.AudioNoteOut])
def list_audio_notes(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.AudioNote)
        .filter(models.AudioNote.patient_id == patient_id)
        .order_by(models.AudioNote.created_at.desc())
        .all()
    )
