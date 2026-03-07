from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models import (
    UserRole,
    BedStatus,
    TaskStatus,
    AlertSeverity,
    ConsentStatus,
    ClinicalNoteStatus,
)


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


# ─── Consent ─────────────────────────────────────────────────────────────────

class ConsentCreate(BaseModel):
    basis: str = "clinical-care"
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None


class ConsentRequestCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    relationship: str
    address: str
    basis: str = "clinical-care"
    notes: Optional[str] = None
    expires_at: Optional[datetime] = None


class ConsentRequestResult(BaseModel):
    consent: "ConsentOut"
    email_sent: bool
    action_url_sent_to: str


class ConsentOut(BaseModel):
    id: int
    patient_id: int
    status: ConsentStatus
    basis: str
    notes: Optional[str] = None
    contact_first_name: Optional[str] = None
    contact_last_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    relationship: Optional[str] = None
    contact_address: Optional[str] = None
    email_sent: bool
    requested_at: datetime
    responded_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    captured_by: int
    captured_at: datetime
    revoked_by: Optional[int] = None
    revoked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Rounding ────────────────────────────────────────────────────────────────

class RoundingPriorityOut(BaseModel):
    patient_id: int
    patient_name: str
    score: int
    reasons: List[str]
    unread_alerts: int
    overdue_tasks: int
    is_serious: bool


# ─── Clinical Notes ──────────────────────────────────────────────────────────

class ClinicalNoteCreate(BaseModel):
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    confidence: float = 0.0


class ClinicalNoteUpdate(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[ClinicalNoteStatus] = None
    confidence: Optional[float] = None


class ClinicalNoteOut(BaseModel):
    id: int
    patient_id: int
    authored_by: int
    reviewed_by: Optional[int] = None
    source_audio_note_id: Optional[int] = None
    status: ClinicalNoteStatus
    subjective: str
    objective: str
    assessment: str
    plan: str
    confidence: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Labs ────────────────────────────────────────────────────────────────────

class LabResultCreate(BaseModel):
    test_name: str
    value: float
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    measured_at: Optional[datetime] = None


class LabResultOut(BaseModel):
    id: int
    patient_id: int
    test_name: str
    value: float
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    is_abnormal: bool
    measured_at: datetime

    model_config = {"from_attributes": True}


class LabSummaryOut(BaseModel):
    test_name: str
    latest_value: float
    unit: Optional[str] = None
    is_abnormal: bool
    trend: str


# ─── Timeline ────────────────────────────────────────────────────────────────

class TimelineEventOut(BaseModel):
    event_type: str
    title: str
    created_at: datetime
    severity: Optional[str] = None
    metadata: dict = {}
