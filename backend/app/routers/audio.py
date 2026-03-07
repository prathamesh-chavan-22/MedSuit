import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from celery.result import AsyncResult

from app import models, schemas
from app.audit import log_event
from app.auth import get_current_user, require_role
from app.celery_app import celery_app
from app.consent import has_active_consent
from app.database import get_db
from app.services.transcription import transcribe_with_google
from app.tasks.audio_tasks import transcribe_audio_note

router = APIRouter(prefix="/audio", tags=["Audio Notes"])

UPLOAD_DIR = "uploads/audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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

    note = models.AudioNote(
        patient_id=patient_id,
        recorded_by=current_user.id,
        audio_file_path=file_path,
        transcript="[Queued for transcription]",
        processing_status=models.AudioProcessingStatus.pending,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    try:
        task = transcribe_audio_note.delay(note.id, file_path)
        note.celery_task_id = task.id
        db.commit()
        db.refresh(note)
    except Exception:
        # Broker may be offline in local dev; fallback to immediate processing.
        transcript = transcribe_with_google(file_path)
        note.transcript = transcript
        note.processing_status = models.AudioProcessingStatus.completed
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


@router.get("/task/{task_id}")
def get_audio_task_status(
    task_id: str,
    _: models.User = Depends(get_current_user),
):
    task = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "state": task.state,
        "ready": task.ready(),
        "successful": task.successful() if task.ready() else False,
        "result": task.result if task.ready() else None,
    }
