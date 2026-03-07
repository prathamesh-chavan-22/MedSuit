from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/rounding", tags=["Rounding"])


def _score_patient(db: Session, patient: models.Patient) -> schemas.RoundingPriorityOut:
    reasons: List[str] = []
    score = 0

    unread_alerts = (
        db.query(models.Alert)
        .filter(models.Alert.patient_id == patient.id, models.Alert.is_read == False)
        .all()
    )
    critical_count = sum(1 for a in unread_alerts if a.severity == models.AlertSeverity.critical)
    warning_count = sum(1 for a in unread_alerts if a.severity == models.AlertSeverity.warning)

    if critical_count:
        score += critical_count * 5
        reasons.append(f"{critical_count} critical unread alert(s)")
    if warning_count:
        score += warning_count * 2
        reasons.append(f"{warning_count} warning unread alert(s)")

    now = datetime.now(timezone.utc)
    tasks = (
        db.query(models.Task)
        .filter(models.Task.patient_id == patient.id, models.Task.status != models.TaskStatus.done)
        .all()
    )
    overdue_tasks = 0
    high_priority_tasks = 0
    for task in tasks:
        if task.priority >= 3:
            high_priority_tasks += 1
        if task.due_at is not None:
            due = task.due_at
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            if due < now:
                overdue_tasks += 1

    if overdue_tasks:
        score += overdue_tasks * 3
        reasons.append(f"{overdue_tasks} overdue task(s)")
    if high_priority_tasks:
        score += high_priority_tasks
        reasons.append(f"{high_priority_tasks} high-priority open task(s)")

    latest_vital = (
        db.query(models.VitalReading)
        .filter(models.VitalReading.patient_id == patient.id)
        .order_by(models.VitalReading.recorded_at.desc())
        .first()
    )
    if latest_vital:
        abnormal = []
        if latest_vital.heart_rate and (latest_vital.heart_rate < 60 or latest_vital.heart_rate > 100):
            abnormal.append("heart rate")
        if latest_vital.spo2 and latest_vital.spo2 < 95:
            abnormal.append("SpO2")
        if latest_vital.temperature and latest_vital.temperature > 38:
            abnormal.append("temperature")
        if abnormal:
            score += 2
            reasons.append(f"abnormal latest vitals: {', '.join(abnormal)}")

    if patient.is_serious:
        score += 5
        reasons.append("marked serious")

    return schemas.RoundingPriorityOut(
        patient_id=patient.id,
        patient_name=patient.full_name,
        score=score,
        reasons=reasons,
        unread_alerts=len(unread_alerts),
        overdue_tasks=overdue_tasks,
        is_serious=patient.is_serious,
    )


@router.get("/priorities", response_model=List[schemas.RoundingPriorityOut])
def get_rounding_priorities(
    limit: int = 10,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    patients = db.query(models.Patient).all()
    scored = [_score_patient(db, p) for p in patients]
    scored.sort(key=lambda item: item.score, reverse=True)
    # Return only actionable rows.
    actionable = [row for row in scored if row.score > 0]
    return actionable[: max(1, min(limit, 50))]
