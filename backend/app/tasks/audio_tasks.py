from datetime import datetime, timezone

from app import models
from app.celery_app import celery_app
from app.database import SessionLocal
from app.services.transcription import transcribe_with_google


@celery_app.task(bind=True, name="app.tasks.audio_tasks.transcribe_audio_note")
def transcribe_audio_note(self, audio_note_id: int, file_path: str) -> dict:
    db = SessionLocal()
    try:
        note = db.query(models.AudioNote).filter(models.AudioNote.id == audio_note_id).first()
        if not note:
            return {"ok": False, "reason": "audio_note_not_found", "audio_note_id": audio_note_id}

        note.processing_status = models.AudioProcessingStatus.processing
        note.celery_task_id = self.request.id
        db.commit()

        transcript = transcribe_with_google(file_path)
        note.transcript = transcript
        note.processing_status = models.AudioProcessingStatus.completed
        note.processing_error = None
        db.commit()
        return {"ok": True, "audio_note_id": audio_note_id, "task_id": self.request.id}
    except Exception as exc:
        note = db.query(models.AudioNote).filter(models.AudioNote.id == audio_note_id).first()
        if note:
            note.processing_status = models.AudioProcessingStatus.failed
            note.processing_error = str(exc)
            db.commit()
        return {"ok": False, "audio_note_id": audio_note_id, "error": str(exc)}
    finally:
        db.close()
