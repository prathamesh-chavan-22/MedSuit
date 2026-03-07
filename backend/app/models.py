from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float,
    ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
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

    tasks = relationship("Task", back_populates="assigned_to_user")
    audio_notes = relationship("AudioNote", back_populates="recorded_by_user")


# ─── Patients ─────────────────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    diagnosis = Column(Text)
    allergies = Column(Text)          # comma-separated or JSON string
    mental_status = Column(String)    # e.g. "stable", "agitated", "confused"
    infection_risk = Column(Boolean, default=False)
    is_serious = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bed = relationship("Bed", back_populates="patient", uselist=False)
    audio_notes = relationship("AudioNote", back_populates="patient")
    vital_readings = relationship("VitalReading", back_populates="patient")
    tasks = relationship("Task", back_populates="patient")
    alerts = relationship("Alert", back_populates="patient")


# ─── Beds ─────────────────────────────────────────────────────────────────────

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    bed_number = Column(String, unique=True, nullable=False)
    ward = Column(String, nullable=False)
    status = Column(Enum(BedStatus), default=BedStatus.available)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    notes = Column(Text)

    patient = relationship("Patient", back_populates="bed")


# ─── Audio Notes ──────────────────────────────────────────────────────────────

class AudioNote(Base):
    __tablename__ = "audio_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    audio_file_path = Column(String)        # path to stored audio file
    transcript = Column(Text)              # Google STT result
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="audio_notes")
    recorded_by_user = relationship("User", back_populates="audio_notes")


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

    patient = relationship("Patient", back_populates="vital_readings")


# ─── Shifts & Tasks ───────────────────────────────────────────────────────────

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)   # e.g. "Morning", "Evening", "Night"
    start_time = Column(String)             # e.g. "08:00"
    end_time = Column(String)               # e.g. "16:00"

    tasks = relationship("Task", back_populates="shift")


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

    patient = relationship("Patient", back_populates="tasks")
    assigned_to_user = relationship("User", back_populates="tasks")
    shift = relationship("Shift", back_populates="tasks")


# ─── Alerts ───────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.info)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="alerts")
