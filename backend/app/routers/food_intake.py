from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/patients", tags=["Food Intake"])


@router.get("/{patient_id}/food", response_model=List[schemas.FoodIntakeOut])
def list_food_intakes(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return (
        db.query(models.FoodIntake)
        .filter(models.FoodIntake.patient_id == patient_id)
        .order_by(models.FoodIntake.taken_at.desc())
        .all()
    )


@router.post("/{patient_id}/food", response_model=schemas.FoodIntakeOut, status_code=201)
def create_food_intake(
    patient_id: int,
    payload: schemas.FoodIntakeCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    intake = models.FoodIntake(
        patient_id=patient_id,
        **payload.model_dump(),
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


@router.delete("/{patient_id}/food/{intake_id}", status_code=204)
def delete_food_intake(
    patient_id: int,
    intake_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    intake = (
        db.query(models.FoodIntake)
        .filter(
            models.FoodIntake.id == intake_id,
            models.FoodIntake.patient_id == patient_id,
        )
        .first()
    )
    if not intake:
        raise HTTPException(status_code=404, detail="Food intake not found")
    db.delete(intake)
    db.commit()
