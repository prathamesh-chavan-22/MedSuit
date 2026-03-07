import json
from typing import Optional

from sqlalchemy.orm import Session

from app import models


def log_event(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    actor_user_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    details: Optional[dict] = None,
    commit: bool = False,
) -> None:
    """Best-effort append-only audit event logger."""
    try:
        event = models.AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            patient_id=patient_id,
            details=json.dumps(details) if details else None,
        )
        db.add(event)
        if commit:
            db.commit()
    except Exception:
        # Never break business flow because of audit write failures.
        db.rollback()
