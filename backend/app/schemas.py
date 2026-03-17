from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List
from datetime import datetime
from app.models import (
    UserRole,
    BedStatus,
    TaskStatus,
    AlertSeverity,
    ConsentStatus,
    ClinicalNoteStatus,
    ClinicalNoteType,
    AdmissionType,
    PatientStatus,
    AudioProcessingStatus,
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


class UserAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None
    session_id: Optional[str] = None
    access_expires_in: Optional[int] = None
    refresh_expires_in: Optional[int] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    session_id: str


class SessionOut(BaseModel):
    id: str
    user_id: int
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    revoked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenData(BaseModel):
    username: Optional[str] = None


# ─── Patients ─────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    full_name: str
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    weight_kg: Optional[float] = Field(default=None, ge=0, le=500)
    height_cm: Optional[float] = Field(default=None, ge=0, le=300)
    diagnosis: Optional[str] = None
    comorbidities: Optional[str] = None
    medications: Optional[str] = None
    allergies: Optional[str] = None
    mental_status: Optional[str] = None
    primary_phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    mrn: Optional[str] = None
    admission_type: AdmissionType = AdmissionType.planned
    patient_status: PatientStatus = PatientStatus.admitted
    admission_at: Optional[datetime] = None
    discharge_at: Optional[datetime] = None
    discharge_summary: Optional[str] = None
    fall_risk: bool = False
    infection_risk: bool = False
    is_serious: bool = False

    @model_validator(mode="after")
    def validate_edge_cases(self):
        if self.discharge_at and self.admission_at and self.discharge_at < self.admission_at:
            raise ValueError("discharge_at cannot be earlier than admission_at")
        if self.patient_status in {PatientStatus.discharged, PatientStatus.deceased} and not self.discharge_at:
            raise ValueError("discharge_at is required when patient is discharged or deceased")
        if self.emergency_contact_name and not self.emergency_contact_phone:
            raise ValueError("emergency_contact_phone is required when emergency_contact_name is provided")
        if self.emergency_contact_phone and not self.emergency_contact_name:
            raise ValueError("emergency_contact_name is required when emergency_contact_phone is provided")
        return self


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    weight_kg: Optional[float] = Field(default=None, ge=0, le=500)
    height_cm: Optional[float] = Field(default=None, ge=0, le=300)
    diagnosis: Optional[str] = None
    comorbidities: Optional[str] = None
    medications: Optional[str] = None
    allergies: Optional[str] = None
    mental_status: Optional[str] = None
    primary_phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_no: Optional[str] = None
    mrn: Optional[str] = None
    patient_status: Optional[PatientStatus] = None
    discharge_at: Optional[datetime] = None
    discharge_summary: Optional[str] = None
    fall_risk: Optional[bool] = None
    infection_risk: Optional[bool] = None
    is_serious: Optional[bool] = None


class PatientOut(PatientCreate):
    id: int
    uhid: str
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
    processing_status: AudioProcessingStatus
    celery_task_id: Optional[str] = None
    processing_error: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Vitals ───────────────────────────────────────────────────────────────────

class VitalReadingCreate(BaseModel):
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    blood_pressure_sys: Optional[float] = None
    blood_pressure_dia: Optional[float] = None
    temperature: Optional[float] = None
    ecg_value: Optional[float] = None


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
    note_type: Optional[str] = "general"


class ClinicalNoteUpdate(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[ClinicalNoteStatus] = None
    confidence: Optional[float] = None
    note_type: Optional[str] = None


class ClinicalNoteOut(BaseModel):
    id: int
    patient_id: int
    authored_by: int
    reviewed_by: Optional[int] = None
    source_audio_note_id: Optional[int] = None
    status: ClinicalNoteStatus
    note_type: str
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
