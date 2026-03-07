from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app import models


def get_latest_consent(db: Session, patient_id: int) -> Optional[models.Consent]:
    return (
        db.query(models.Consent)
        .filter(models.Consent.patient_id == patient_id)
        .order_by(models.Consent.captured_at.desc())
        .first()
    )


def has_active_consent(db: Session, patient_id: int) -> bool:
    consent = get_latest_consent(db, patient_id)
    if not consent:
        return False

    if consent.status != models.ConsentStatus.active:
        return False

    if consent.revoked_at is not None:
        return False

    if consent.expires_at is not None:
        now = datetime.now(timezone.utc)
        expires_at = consent.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            return False

    return True
