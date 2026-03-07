from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post("/", response_model=schemas.PatientOut, status_code=201)
def create_patient(
    patient_in: schemas.PatientCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.doctor)),
):
    patient = models.Patient(**patient_in.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/", response_model=List[schemas.PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return db.query(models.Patient).all()


@router.get("/{patient_id}", response_model=schemas.PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=schemas.PatientOut)
def update_patient(
    patient_id: int,
    patient_in: schemas.PatientCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.doctor)),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for key, value in patient_in.model_dump().items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.doctor)),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
