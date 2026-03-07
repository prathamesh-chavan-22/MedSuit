from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models import UserRole, BedStatus, TaskStatus, AlertSeverity


# ─── Auth / Users ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.nurse


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ─── Patients ─────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    diagnosis: Optional[str] = None
    allergies: Optional[str] = None
    mental_status: Optional[str] = None
    infection_risk: bool = False
    is_serious: bool = False


class PatientOut(PatientCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Beds ─────────────────────────────────────────────────────────────────────

class BedCreate(BaseModel):
    bed_number: str
    ward: str
    notes: Optional[str] = None


class BedAssign(BaseModel):
    patient_id: Optional[int] = None


class BedOut(BaseModel):
    id: int
    bed_number: str
    ward: str
    status: BedStatus
    patient_id: Optional[int] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


# ─── Audio Notes ──────────────────────────────────────────────────────────────

class AudioNoteOut(BaseModel):
    id: int
    patient_id: int
    recorded_by: int
    transcript: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Vitals ───────────────────────────────────────────────────────────────────

class VitalReadingOut(BaseModel):
    id: int
    patient_id: int
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    blood_pressure_sys: Optional[float] = None
    blood_pressure_dia: Optional[float] = None
    temperature: Optional[float] = None
    ecg_value: Optional[float] = None
    recorded_at: datetime

    model_config = {"from_attributes": True}


# ─── Shifts ───────────────────────────────────────────────────────────────────

class ShiftCreate(BaseModel):
    name: str
    start_time: str
    end_time: str


class ShiftOut(ShiftCreate):
    id: int

    model_config = {"from_attributes": True}


# ─── Tasks ────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    patient_id: int
    assigned_to: Optional[int] = None
    shift_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: int = 1
    due_at: Optional[datetime] = None


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    assigned_to: Optional[int] = None
    priority: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    patient_id: int
    assigned_to: Optional[int] = None
    shift_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: int
    due_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Alerts ───────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    patient_id: Optional[int] = None
    severity: AlertSeverity
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}
