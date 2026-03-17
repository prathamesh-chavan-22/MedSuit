from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

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
    if patient_in.mrn:
        existing = db.query(models.Patient).filter(models.Patient.mrn == patient_in.mrn).first()
        if existing:
            raise HTTPException(status_code=400, detail="MRN already exists")

    patient = models.Patient(**patient_in.model_dump())
    patient.uhid = models.Patient.generate_uhid()
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/", response_model=List[schemas.PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by name, MRN, UHID, or diagnosis"),
):
    query = db.query(models.Patient).options(joinedload(models.Patient.diseases))
    if search:
        query = query.filter(
            (models.Patient.full_name.ilike(f"%{search}%"))
            | (models.Patient.mrn.ilike(f"%{search}%"))
            | (models.Patient.uhid.ilike(f"%{search}%"))
            | (models.Patient.diagnosis.ilike(f"%{search}%"))
        )
    return query.all()


@router.get("/uhid/{uhid}", response_model=schemas.PatientOut)
def get_patient_by_uhid(
    uhid: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).options(joinedload(models.Patient.diseases)).filter(models.Patient.uhid == uhid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient with given UHID not found")
    return patient


@router.get("/{patient_id}", response_model=schemas.PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).options(joinedload(models.Patient.diseases)).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put("/{patient_id}", response_model=schemas.PatientOut)
def update_patient(
    patient_id: int,
    patient_in: schemas.PatientUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role(models.UserRole.admin, models.UserRole.doctor)),
):
    patient = db.query(models.Patient).options(joinedload(models.Patient.diseases)).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if patient_in.mrn:
        existing = (
            db.query(models.Patient)
            .filter(models.Patient.mrn == patient_in.mrn)
            .filter(models.Patient.id != patient_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="MRN already exists")

    for key, value in patient_in.model_dump(exclude_none=True).items():
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
