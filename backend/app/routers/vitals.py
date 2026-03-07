import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/vitals", tags=["Vitals"])


def _mock_vitals(patient_id: int) -> dict:
    """Generate realistic but randomised vital signs for demo purposes."""
    return {
        "patient_id": patient_id,
        "heart_rate": round(random.uniform(58, 105), 1),
        "spo2": round(random.uniform(92, 100), 1),
        "blood_pressure_sys": round(random.uniform(100, 145), 1),
        "blood_pressure_dia": round(random.uniform(60, 95), 1),
        "temperature": round(random.uniform(36.1, 38.5), 1),
        "ecg_value": round(random.uniform(-1.0, 1.0), 3),
    }


@router.post("/mock/{patient_id}", response_model=schemas.VitalReadingOut, status_code=201)
def ingest_mock_vitals(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    """Simulate a vital reading from a bedside monitor (demo only)."""
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    data = _mock_vitals(patient_id)
    reading = models.VitalReading(**data)
    db.add(reading)
    db.commit()
    db.refresh(reading)

    # Auto-generate alert if serious thresholds are breached
    alerts = []
    if reading.heart_rate and (reading.heart_rate > 100 or reading.heart_rate < 60):
        alerts.append(f"Abnormal heart rate: {reading.heart_rate} bpm")
    if reading.spo2 and reading.spo2 < 95:
        alerts.append(f"Low SpO2: {reading.spo2}%")
    if reading.temperature and reading.temperature > 38.0:
        alerts.append(f"Fever detected: {reading.temperature}°C")

    for msg in alerts:
        alert = models.Alert(
            patient_id=patient_id,
            severity=models.AlertSeverity.warning,
            message=msg,
        )
        db.add(alert)
    if alerts:
        db.commit()

    return reading


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
