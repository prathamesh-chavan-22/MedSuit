from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/patients", tags=["Medication Intake"])


@router.get("/{patient_id}/medications", response_model=List[schemas.MedicationIntakeOut])
def list_medication_intakes(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return (
        db.query(models.MedicationIntake)
        .filter(models.MedicationIntake.patient_id == patient_id)
        .order_by(models.MedicationIntake.taken_at.desc())
        .all()
    )


@router.post("/{patient_id}/medications", response_model=schemas.MedicationIntakeOut, status_code=201)
def create_medication_intake(
    patient_id: int,
    payload: schemas.MedicationIntakeCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    intake = models.MedicationIntake(
        patient_id=patient_id,
        **payload.model_dump(),
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


@router.delete("/{patient_id}/medications/{intake_id}", status_code=204)
def delete_medication_intake(
    patient_id: int,
    intake_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    intake = (
        db.query(models.MedicationIntake)
        .filter(
            models.MedicationIntake.id == intake_id,
            models.MedicationIntake.patient_id == patient_id,
        )
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Medication intake not found")
    db.delete(intake)
    db.commit()
