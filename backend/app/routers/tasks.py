from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app import models, schemas
from app.auth import get_current_user, require_role
from app.database import get_db

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# ─── Shifts ───────────────────────────────────────────────────────────────────

@router.post("/shifts", response_model=schemas.ShiftOut, status_code=201)
def create_shift(
    shift_in: schemas.ShiftCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    shift = models.Shift(**shift_in.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.get("/shifts", response_model=List[schemas.ShiftOut])
def list_shifts(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    return db.query(models.Shift).all()


# ─── Tasks ────────────────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.TaskOut, status_code=201)
def create_task(
    task_in: schemas.TaskCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    if task_in.assigned_to is not None:
        if not db.query(models.User).filter(models.User.id == task_in.assigned_to).first():
            raise HTTPException(status_code=400, detail="Assigned user does not exist")
    task = models.Task(**task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/", response_model=List[schemas.TaskOut])
def list_tasks(
    shift_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    patient_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Task)
    if shift_id:
        query = query.filter(models.Task.shift_id == shift_id)
    if assigned_to:
        query = query.filter(models.Task.assigned_to == assigned_to)
    if patient_id:
        query = query.filter(models.Task.patient_id == patient_id)
    return query.order_by(models.Task.priority.desc()).all()


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in update.model_dump(exclude_none=True).items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(
        require_role(models.UserRole.admin, models.UserRole.doctor, models.UserRole.nurse)
    ),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
