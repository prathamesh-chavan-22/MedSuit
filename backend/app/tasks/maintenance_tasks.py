from datetime import datetime, timezone

from app import models
from app.auth import cleanup_expired_sessions
from app.celery_app import celery_app
from app.database import SessionLocal


@celery_app.task(name="app.tasks.maintenance_tasks.cleanup_expired_sessions_task")
def cleanup_expired_sessions_task() -> dict:
    db = SessionLocal()
    try:
        count = cleanup_expired_sessions(db)
        return {"ok": True, "cleaned_sessions": count}
    finally:
        db.close()


@celery_app.task(name="app.tasks.maintenance_tasks.expire_consents_task")
def expire_consents_task() -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        rows = (
            db.query(models.Consent)
            .filter(models.Consent.expires_at.is_not(None))
            .filter(models.Consent.expires_at <= now)
            .filter(models.Consent.status == models.ConsentStatus.active)
            .all()
        )
        for row in rows:
            row.status = models.ConsentStatus.expired
        db.commit()
        return {"ok": True, "expired_consents": len(rows)}
    finally:
        db.close()
