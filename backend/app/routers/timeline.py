from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/patients", tags=["Timeline"])


@router.get("/uhid/{uhid}/timeline", response_model=List[schemas.TimelineEventOut])
def patient_timeline_by_uhid(
    uhid: str,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.uhid == uhid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient with given UHID not found")

    return _get_patient_timeline_events(db, patient.id, limit)


@router.get("/{patient_id}/timeline", response_model=List[schemas.TimelineEventOut])
def patient_timeline(
    patient_id: int,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return _get_patient_timeline_events(db, patient_id, limit)


def _get_patient_timeline_events(db: Session, patient_id: int, limit: int = 100) -> List[schemas.TimelineEventOut]:

    events: List[schemas.TimelineEventOut] = []

    for row in (
        db.query(models.VitalReading)
        .filter(models.VitalReading.patient_id == patient_id)
        .order_by(models.VitalReading.recorded_at.desc())
        .limit(limit)
        .all()
    ):
        events.append(
            schemas.TimelineEventOut(
                event_type="vital",
                title="Vital reading recorded",
                created_at=row.recorded_at,
                metadata={
                    "heart_rate": row.heart_rate,
                    "spo2": row.spo2,
                    "temperature": row.temperature,
                },
            )
        )

    for row in (
        db.query(models.Alert)
        .filter(models.Alert.patient_id == patient_id)
        .order_by(models.Alert.created_at.desc())
        .limit(limit)
        .all()
    ):
        events.append(
            schemas.TimelineEventOut(
                event_type="alert",
                title=row.message,
                created_at=row.created_at,
                severity=row.severity.value,
                metadata={"is_read": row.is_read},
            )
        )

    for row in (
        db.query(models.Task)
        .filter(models.Task.patient_id == patient_id)
        .order_by(models.Task.created_at.desc())
        .limit(limit)
        .all()
    ):
        events.append(
            schemas.TimelineEventOut(
                event_type="task",
                title=row.title,
                created_at=row.created_at,
                metadata={"status": row.status.value, "priority": row.priority},
            )
        )

    for row in (
        db.query(models.AudioNote)
        .filter(models.AudioNote.patient_id == patient_id)
        .order_by(models.AudioNote.created_at.desc())
        .limit(limit)
        .all()
    ):
        events.append(
            schemas.TimelineEventOut(
                event_type="audio_note",
                title="Audio note captured",
                created_at=row.created_at,
                metadata={"audio_note_id": row.id},
            )
        )

    for row in (
        db.query(models.Consent)
        .filter(models.Consent.patient_id == patient_id)
        .order_by(models.Consent.captured_at.desc())
        .limit(limit)
        .all()
    ):
        events.append(
            schemas.TimelineEventOut(
                event_type="consent",
                title=f"Consent {row.status.value}",
                created_at=row.captured_at,
                metadata={"basis": row.basis, "expires_at": str(row.expires_at) if row.expires_at else None},
            )
        )

    for row in (
        db.query(models.ClinicalNote)
        .filter(models.ClinicalNote.patient_id == patient_id)
        .order_by(models.ClinicalNote.created_at.desc())
        .limit(limit)
        .all()
    ):
        events.append(
            schemas.TimelineEventOut(
                event_type="clinical_note",
                title=f"Clinical note {row.status.value}",
                created_at=row.created_at,
                metadata={"note_id": row.id, "confidence": row.confidence},
            )
        )

    for row in (
        db.query(models.LabResult)
        .filter(models.LabResult.patient_id == patient_id)
        .order_by(models.LabResult.measured_at.desc())
        .limit(limit)
        .all()
    ):
        events.append(
            schemas.TimelineEventOut(
                event_type="lab",
                title=f"Lab: {row.test_name}",
                created_at=row.measured_at,
                severity="warning" if row.is_abnormal else None,
                metadata={"value": row.value, "unit": row.unit, "abnormal": row.is_abnormal},
            )
        )

    events.sort(key=lambda item: item.created_at if isinstance(item.created_at, datetime) else datetime.min, reverse=True)
    return events[: max(1, min(limit, 200))]
