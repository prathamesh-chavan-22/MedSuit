from datetime import datetime, timezone
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

    now = datetime.now(timezone.utc)
    events: List[schemas.TimelineEventOut] = []

    # ── Vitals ────────────────────────────────────────────────────────────────
    for row in (
        db.query(models.VitalReading)
        .filter(models.VitalReading.patient_id == patient_id)
        .order_by(models.VitalReading.recorded_at.desc())
        .limit(limit)
        .all()
    ):
        hr = row.heart_rate
        spo2 = row.spo2
        temp = row.temperature
        severity = None
        if hr and (hr > 100 or hr < 60):
            severity = "warning"
        if spo2 and spo2 < 95:
            severity = "warning"
        if temp and temp > 38:
            severity = "warning"
        events.append(
            schemas.TimelineEventOut(
                event_type="vital",
                title="Vital Signs Recorded",
                created_at=row.recorded_at,
                severity=severity,
                metadata={
                    "heart_rate": row.heart_rate,
                    "spo2": row.spo2,
                    "temperature": row.temperature,
                    "blood_pressure_sys": row.blood_pressure_sys,
                    "blood_pressure_dia": row.blood_pressure_dia,
                },
            )
        )

    # ── Alerts ────────────────────────────────────────────────────────────────
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

    # ── Tasks (past + future) ─────────────────────────────────────────────────
    for row in (
        db.query(models.Task)
        .filter(models.Task.patient_id == patient_id)
        .order_by(models.Task.created_at.desc())
        .limit(limit)
        .all()
    ):
        is_future = bool(
            row.due_at and row.due_at.replace(tzinfo=timezone.utc) > now
        )
        events.append(
            schemas.TimelineEventOut(
                event_type="task",
                title=row.title,
                created_at=row.due_at if is_future else row.created_at,
                metadata={
                    "status": row.status.value,
                    "priority": row.priority,
                    "is_future": is_future,
                    "due_at": str(row.due_at) if row.due_at else None,
                },
            )
        )

    # ── Audio Notes ───────────────────────────────────────────────────────────
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
                title="Audio Note Captured",
                created_at=row.created_at,
                metadata={
                    "audio_note_id": row.id,
                    "transcript_preview": (row.transcript or "")[:80],
                },
            )
        )

    # ── Consents ──────────────────────────────────────────────────────────────
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
                title=f"Consent {row.status.value.capitalize()}",
                created_at=row.captured_at,
                metadata={
                    "basis": row.basis,
                    "expires_at": str(row.expires_at) if row.expires_at else None,
                },
            )
        )

    # ── Clinical Notes ────────────────────────────────────────────────────────
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
                title=f"Clinical Note — {row.note_type.value.capitalize()} ({row.status.value})",
                created_at=row.created_at,
                metadata={
                    "note_id": row.id,
                    "confidence": row.confidence,
                    "note_type": row.note_type.value,
                    "subjective_preview": row.subjective[:100] if row.subjective else "",
                },
            )
        )

    # ── Lab Results ───────────────────────────────────────────────────────────
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

    # ── Medication Intakes (past + scheduled future) ──────────────────────────
    for row in (
        db.query(models.MedicationIntake)
        .filter(models.MedicationIntake.patient_id == patient_id)
        .order_by(models.MedicationIntake.taken_at.desc())
        .limit(limit)
        .all()
    ):
        label = "Medication Scheduled" if row.is_scheduled else "Medication Given"
        events.append(
            schemas.TimelineEventOut(
                event_type="medication",
                title=f"{label}: {row.medication_name}",
                created_at=row.taken_at,
                metadata={
                    "medication_name": row.medication_name,
                    "dosage": row.dosage,
                    "route": row.route,
                    "is_future": row.is_scheduled,
                    "notes": row.notes,
                },
            )
        )

    # ── Food Intakes ──────────────────────────────────────────────────────────
    for row in (
        db.query(models.FoodIntake)
        .filter(models.FoodIntake.patient_id == patient_id)
        .order_by(models.FoodIntake.taken_at.desc())
        .limit(limit)
        .all()
    ):
        meal_label = row.meal_type.capitalize() if row.meal_type else "Meal"
        events.append(
            schemas.TimelineEventOut(
                event_type="food",
                title=f"{meal_label}: {row.food_item}",
                created_at=row.taken_at,
                metadata={
                    "food_item": row.food_item,
                    "quantity": row.quantity,
                    "meal_type": row.meal_type,
                    "calories": row.calories,
                    "notes": row.notes,
                },
            )
        )

    def sort_key(item: schemas.TimelineEventOut) -> datetime:
        dt = item.created_at if isinstance(item.created_at, datetime) else datetime.min
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    events.sort(key=sort_key, reverse=True)
    return events[: max(1, min(limit, 500))]
