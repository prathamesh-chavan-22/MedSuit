from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float,
    ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship as orm_relationship
from sqlalchemy.sql import func
import enum
import secrets
from datetime import datetime
from app.database import Base


class UserRole(str, enum.Enum):
    doctor = "doctor"
    nurse = "nurse"
    admin = "admin"


class BedStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    maintenance = "maintenance"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    done = "done"


class AlertSeverity(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class ConsentStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    declined = "declined"
    revoked = "revoked"
    expired = "expired"


class ClinicalNoteStatus(str, enum.Enum):
    draft = "draft"
    reviewed = "reviewed"
    finalized = "finalized"


class AdmissionType(str, enum.Enum):
    emergency = "emergency"
    planned = "planned"
    transfer = "transfer"


class PatientStatus(str, enum.Enum):
    admitted = "admitted"
    in_observation = "in_observation"
    discharged = "discharged"
    deceased = "deceased"


class AudioProcessingStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


# ─── Users ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.nurse)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tasks = orm_relationship("Task", back_populates="assigned_to_user")
    audio_notes = orm_relationship("AudioNote", back_populates="recorded_by_user")
    captured_consents = orm_relationship(
        "Consent", foreign_keys="Consent.captured_by", back_populates="captured_by_user"
    )
    revoked_consents = orm_relationship(
        "Consent", foreign_keys="Consent.revoked_by", back_populates="revoked_by_user"
    )
    audit_events = orm_relationship("AuditLog", back_populates="actor_user")
    clinical_notes = orm_relationship("ClinicalNote", foreign_keys="ClinicalNote.authored_by", back_populates="author_user")
    reviewed_notes = orm_relationship("ClinicalNote", foreign_keys="ClinicalNote.reviewed_by", back_populates="reviewer_user")
    sessions = orm_relationship("UserSession", back_populates="user")


# ─── Patients ─────────────────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    uhid = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    blood_group = Column(String)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    diagnosis = Column(Text)
    comorbidities = Column(Text)
    medications = Column(Text)
    allergies = Column(Text)          # comma-separated or JSON string
    mental_status = Column(String)    # e.g. "stable", "agitated", "confused"
    primary_phone = Column(String)
    secondary_phone = Column(String)
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    emergency_contact_relationship = Column(String)
    address = Column(Text)
    city = Column(String)
    state = Column(String)
    pincode = Column(String)
    insurance_provider = Column(String)
    insurance_policy_no = Column(String)
    mrn = Column(String, unique=True, index=True)
    admission_type = Column(Enum(AdmissionType), default=AdmissionType.planned)
    patient_status = Column(Enum(PatientStatus), default=PatientStatus.admitted, index=True)
    admission_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    discharge_at = Column(DateTime(timezone=True), nullable=True)
    discharge_summary = Column(Text)
    fall_risk = Column(Boolean, default=False)
    infection_risk = Column(Boolean, default=False)
    is_serious = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @staticmethod
    def generate_uhid() -> str:
        date_str = datetime.utcnow().strftime("%Y%m%d")
        rand_part = secrets.token_hex(3).upper()  # 6 uppercase hex chars
        return f"UHID-{date_str}-{rand_part}"

    bed = orm_relationship("Bed", back_populates="patient", uselist=False)
    audio_notes = orm_relationship("AudioNote", back_populates="patient")
    vital_readings = orm_relationship("VitalReading", back_populates="patient")
    tasks = orm_relationship("Task", back_populates="patient")
    alerts = orm_relationship("Alert", back_populates="patient")
    consents = orm_relationship("Consent", back_populates="patient")
    audit_events = orm_relationship("AuditLog", back_populates="patient")
    clinical_notes = orm_relationship("ClinicalNote", back_populates="patient")
    lab_results = orm_relationship("LabResult", back_populates="patient")


# ─── Beds ─────────────────────────────────────────────────────────────────────

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    bed_number = Column(String, unique=True, nullable=False)
    ward = Column(String, nullable=False)
    status = Column(Enum(BedStatus), default=BedStatus.available)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    notes = Column(Text)

    patient = orm_relationship("Patient", back_populates="bed")


# ─── Audio Notes ──────────────────────────────────────────────────────────────

class AudioNote(Base):
    __tablename__ = "audio_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    audio_file_path = Column(String)        # path to stored audio file
    transcript = Column(Text)              # Google STT result
    processing_status = Column(Enum(AudioProcessingStatus), default=AudioProcessingStatus.pending, nullable=False)
    celery_task_id = Column(String, nullable=True, index=True)
    processing_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = orm_relationship("Patient", back_populates="audio_notes")
    recorded_by_user = orm_relationship("User", back_populates="audio_notes")


# ─── Vitals ───────────────────────────────────────────────────────────────────

class VitalReading(Base):
    __tablename__ = "vital_readings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    heart_rate = Column(Float)      # bpm
    spo2 = Column(Float)            # %
    blood_pressure_sys = Column(Float)
    blood_pressure_dia = Column(Float)
    temperature = Column(Float)     # Celsius
    ecg_value = Column(Float)       # simplified mock voltage
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = orm_relationship("Patient", back_populates="vital_readings")


# ─── Shifts & Tasks ───────────────────────────────────────────────────────────

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)   # e.g. "Morning", "Evening", "Night"
    start_time = Column(String)             # e.g. "08:00"
    end_time = Column(String)               # e.g. "16:00"

    tasks = orm_relationship("Task", back_populates="shift")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus), default=TaskStatus.pending)
    priority = Column(Integer, default=1)   # 1=low, 2=medium, 3=high
    due_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient = orm_relationship("Patient", back_populates="tasks")
    assigned_to_user = orm_relationship("User", back_populates="tasks")
    shift = orm_relationship("Shift", back_populates="tasks")


# ─── Alerts ───────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.info)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = orm_relationship("Patient", back_populates="alerts")


# ─── Consent & Audit ─────────────────────────────────────────────────────────

class Consent(Base):
    __tablename__ = "consents"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    status = Column(Enum(ConsentStatus), default=ConsentStatus.pending, nullable=False)
    basis = Column(String, default="clinical-care", nullable=False)
    notes = Column(Text)
    contact_first_name = Column(String, nullable=True)
    contact_last_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    relationship = Column(String, nullable=True)
    contact_address = Column(Text, nullable=True)
    action_token = Column(String, unique=True, index=True, nullable=True)
    email_sent = Column(Boolean, default=False)
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    captured_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    captured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    patient = orm_relationship("Patient", back_populates="consents")
    captured_by_user = orm_relationship("User", foreign_keys=[captured_by], back_populates="captured_consents")
    revoked_by_user = orm_relationship("User", foreign_keys=[revoked_by], back_populates="revoked_consents")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(Integer, nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True, index=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    actor_user = orm_relationship("User", back_populates="audit_events")
    patient = orm_relationship("Patient", back_populates="audit_events")


# ─── Clinical Notes & Labs ───────────────────────────────────────────────────

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    authored_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    source_audio_note_id = Column(Integer, ForeignKey("audio_notes.id"), nullable=True)
    status = Column(Enum(ClinicalNoteStatus), default=ClinicalNoteStatus.draft, nullable=False)
    subjective = Column(Text, default="")
    objective = Column(Text, default="")
    assessment = Column(Text, default="")
    plan = Column(Text, default="")
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    finalized_at = Column(DateTime(timezone=True), nullable=True)

    patient = orm_relationship("Patient", back_populates="clinical_notes")
    author_user = orm_relationship("User", foreign_keys=[authored_by], back_populates="clinical_notes")
    reviewer_user = orm_relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_notes")
    source_audio_note = orm_relationship("AudioNote")


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    test_name = Column(String, nullable=False, index=True)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=True)
    reference_low = Column(Float, nullable=True)
    reference_high = Column(Float, nullable=True)
    is_abnormal = Column(Boolean, default=False)
    measured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = orm_relationship("Patient", back_populates="lab_results")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    refresh_token_hash = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = orm_relationship("User", back_populates="sessions")
