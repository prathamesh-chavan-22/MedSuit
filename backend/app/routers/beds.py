from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/beds", tags=["Beds"])


def _suggest_bed(db: Session, patient: models.Patient) -> Optional[models.Bed]:
    """Simple rule engine: pick available bed in same ward, avoid conflicts."""
    available = (
        db.query(models.Bed)
        .filter(models.Bed.status == models.BedStatus.available)
        .all()
    )
    if not available:
        return None

    # Prefer beds away from patients with allergies / infection risk if patient is OK
    # This is a simple heuristic; expand rules as needed
    for bed in available:
        return bed  # first available for demo; extend with scoring logic
    return None


@router.post("/", response_model=schemas.BedOut, status_code=201)
def create_bed(
    bed_in: schemas.BedCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    bed = models.Bed(**bed_in.model_dump())
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed


@router.get("/", response_model=List[schemas.BedOut])
def list_beds(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return db.query(models.Bed).all()


@router.get("/{bed_id}", response_model=schemas.BedOut)
def get_bed(
    bed_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    bed = db.query(models.Bed).filter(models.Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    return bed


@router.patch("/{bed_id}/assign", response_model=schemas.BedOut)
def assign_patient(
    bed_id: int,
    body: schemas.BedAssign,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    bed = db.query(models.Bed).filter(models.Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    if body.patient_id is None:
        # Unassign
        bed.patient_id = None
        bed.status = models.BedStatus.available
    else:
        patient = db.query(models.Patient).filter(models.Patient.id == body.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        bed.patient_id = body.patient_id
        bed.status = models.BedStatus.occupied

    db.commit()
    db.refresh(bed)
    return bed


@router.get("/suggest/{patient_id}", response_model=Optional[schemas.BedOut])
def suggest_bed(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    bed = _suggest_bed(db, patient)
    return bed
