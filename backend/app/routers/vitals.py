import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app import models, schemas
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/vitals", tags=["Vitals"])


def _mock_vitals(patient_id: int, payload: Optional[schemas.VitalReadingCreate] = None) -> dict:
    """Generate vital signs, honouring values from a simulator payload when present."""
    defaults = {
        "heart_rate": round(random.uniform(58, 105), 1),
        "spo2": round(random.uniform(92, 100), 1),
        "blood_pressure_sys": round(random.uniform(100, 145), 1),
        "blood_pressure_dia": round(random.uniform(60, 95), 1),
        "temperature": round(random.uniform(36.1, 38.5), 1),
        "ecg_value": round(random.uniform(-1.0, 1.0), 3),
    }
    if payload:
        supplied = payload.model_dump(exclude_none=True)
        defaults.update(supplied)
    return {"patient_id": patient_id, **defaults}


@router.post("/mock/{patient_id}", response_model=schemas.VitalReadingOut, status_code=201)
def ingest_mock_vitals(
    patient_id: int,
    vitals_in: Optional[schemas.VitalReadingCreate] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    """Simulate a vital reading from a bedside monitor (demo only)."""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    data = _mock_vitals(patient_id, vitals_in)
    reading = models.VitalReading(**data)
    db.add(reading)
    db.commit()
    db.refresh(reading)

    # Auto-generate alert if serious thresholds are breached
    # Each alert type has a "key" prefix. We deduplicate by only allowing one
    # active (unread) alert per type per patient — updating its message if it
    # already exists instead of inserting a redundant row.
    triggered: list[tuple[str, str, models.AlertSeverity]] = []  # (key, message, severity)

    if reading.heart_rate and (reading.heart_rate > 100 or reading.heart_rate < 60):
        triggered.append((
            "Abnormal heart rate",
            f"Abnormal heart rate: {int(reading.heart_rate)} bpm",
            models.AlertSeverity.warning,
        ))
    if reading.spo2 and reading.spo2 < 95:
        triggered.append((
            "Low SpO2",
            f"Low SpO2: {int(reading.spo2)}%",
            models.AlertSeverity.critical if reading.spo2 < 90 else models.AlertSeverity.warning,
        ))
    if reading.temperature and reading.temperature > 38.0:
        triggered.append((
            "Fever detected",
            f"Fever detected: {reading.temperature:.1f}°C",
            models.AlertSeverity.critical if reading.temperature > 39.5 else models.AlertSeverity.warning,
        ))

    from datetime import datetime, timezone

    changed = False
    for key, msg, severity in triggered:
        # Look for an existing unread alert of this type for this patient
        existing = (
            db.query(models.Alert)
            .filter(
                models.Alert.patient_id == patient_id,
                models.Alert.is_read == False,
                models.Alert.message.like(f"{key}:%"),
            )
            .first()
        )
        if existing:
            # Update in-place — no new row created
            existing.message = msg
            existing.severity = severity
            existing.created_at = datetime.now(timezone.utc)
            changed = True
        else:
            db.add(models.Alert(patient_id=patient_id, severity=severity, message=msg))
            changed = True

    # Also resolve alerts whose condition has cleared (e.g. hr is now normal)
    # by marking them resolved (read) so they don't linger
    all_keys = {"Abnormal heart rate", "Low SpO2", "Fever detected"}
    triggered_keys = {t[0] for t in triggered}
    cleared_keys = all_keys - triggered_keys
    for key in cleared_keys:
        resolved = (
            db.query(models.Alert)
            .filter(
                models.Alert.patient_id == patient_id,
                models.Alert.is_read == False,
                models.Alert.message.like(f"{key}:%"),
            )
            .all()
        )
        for a in resolved:
            a.is_read = True
            changed = True

    if changed:
        db.commit()

    return reading


@router.get("/latest", response_model=List[schemas.VitalReadingOut])
def get_latest_vitals(
    patient_ids: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Return the single most-recent vital reading for each requested patient.

    Query param `patient_ids` is a comma-separated list of integer IDs.
    If omitted, returns the latest reading for *every* patient that has at least one.
    """
    from sqlalchemy import func as sa_func

    subq = (
        db.query(
            models.VitalReading.patient_id,
            sa_func.max(models.VitalReading.id).label("max_id"),
        )
        .group_by(models.VitalReading.patient_id)
    )

    if patient_ids:
        try:
            ids = [int(x.strip()) for x in patient_ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="patient_ids must be comma-separated integers")
        subq = subq.filter(models.VitalReading.patient_id.in_(ids))

    subq = subq.subquery()

    rows = (
        db.query(models.VitalReading)
        .join(subq, models.VitalReading.id == subq.c.max_id)
        .all()
    )
    return rows


@router.get("/{patient_id}", response_model=List[schemas.VitalReadingOut])
def get_vitals(
    patient_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.VitalReading)
        .filter(models.VitalReading.patient_id == patient_id)
        .order_by(models.VitalReading.recorded_at.desc())
        .limit(limit)
        .all()
    )
