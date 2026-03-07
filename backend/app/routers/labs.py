from collections import defaultdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.audit import log_event
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/labs", tags=["Labs"])


def _is_abnormal(value: float, ref_low: float | None, ref_high: float | None) -> bool:
    if ref_low is not None and value < ref_low:
        return True
    if ref_high is not None and value > ref_high:
        return True
    return False


@router.post("/patients/{patient_id}", response_model=schemas.LabResultOut, status_code=201)
def ingest_lab_result(
    patient_id: int,
    body: schemas.LabResultCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    row = models.LabResult(
        patient_id=patient_id,
        test_name=body.test_name,
        value=body.value,
        unit=body.unit,
        reference_low=body.reference_low,
        reference_high=body.reference_high,
        is_abnormal=_is_abnormal(body.value, body.reference_low, body.reference_high),
        measured_at=body.measured_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    log_event(
        db,
        action="lab.ingested",
        entity_type="lab_result",
        entity_id=row.id,
        actor_user_id=current_user.id,
        patient_id=patient_id,
        details={"test_name": row.test_name, "is_abnormal": row.is_abnormal},
        commit=True,
    )

    return row


@router.get("/patients/{patient_id}", response_model=List[schemas.LabResultOut])
def list_lab_results(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.LabResult)
        .filter(models.LabResult.patient_id == patient_id)
        .order_by(models.LabResult.measured_at.desc())
        .all()
    )


@router.get("/patients/{patient_id}/summary", response_model=List[schemas.LabSummaryOut])
def summarize_lab_results(
    patient_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.LabResult)
        .filter(models.LabResult.patient_id == patient_id)
        .order_by(models.LabResult.measured_at.desc())
        .all()
    )

    grouped: dict[str, list[models.LabResult]] = defaultdict(list)
    for row in rows:
        grouped[row.test_name].append(row)

    summary: List[schemas.LabSummaryOut] = []
    for test_name, results in grouped.items():
        latest = results[0]
        trend = "stable"
        if len(results) >= 2:
            delta = latest.value - results[1].value
            if abs(delta) < 1e-6:
                trend = "stable"
            else:
                trend = "up" if delta > 0 else "down"

        summary.append(
            schemas.LabSummaryOut(
                test_name=test_name,
                latest_value=latest.value,
                unit=latest.unit,
                is_abnormal=latest.is_abnormal,
                trend=trend,
            )
        )

    summary.sort(key=lambda item: (not item.is_abnormal, item.test_name.lower()))
    return summary
