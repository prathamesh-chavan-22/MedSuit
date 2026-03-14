"""Seed database with test data"""
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal
from app import models
import secrets

def hash_password(password: str) -> str:
    """Simple password hashing (in production use proper bcrypt)"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

def seed_database():
    # Drop all tables and recreate from current schema
    from app.database import engine, Base
    # Base.metadata.drop_all(bind=engine)
    # Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Clear existing data
        # db.query(models.User).delete()
        # db.query(models.Patient).delete()
        # db.query(models.Bed).delete()
        # db.commit()

        # Create users
        users = [
            models.User(
                username="admin",
                full_name="Admin User",
                email="admin@medsuite.local",
                hashed_password=hash_password("admin123"),
                role=models.UserRole.admin,
            ),
            models.User(
                username="dr_smith",
                full_name="Dr. Smith",
                email="smith@medsuite.local",
                hashed_password=hash_password("password123"),
                role=models.UserRole.doctor,
            ),
            models.User(
                username="nurse_john",
                full_name="John Nurse",
                email="john@medsuite.local",
                hashed_password=hash_password("password123"),
                role=models.UserRole.nurse,
            ),
        ]
        db.add_all(users)
        db.commit()
        print(f"[OK] Created {len(users)} users")

        # Create beds
        beds = []
        for ward in ["ICU", "General", "Cardiology"]:
            for bed_num in range(1, 4):
                bed = models.Bed(
                    bed_number=f"{ward}-{bed_num}",
                    ward=ward,
                    status=models.BedStatus.available,
                )
                beds.append(bed)
        db.add_all(beds)
        db.commit()
        print(f"[OK] Created {len(beds)} beds")

        # Create patients with UHID
        patient_data = [
            {
                "full_name": "John Doe",
                "age": 45,
                "gender": "M",
                "blood_group": "O+",
                "weight_kg": 75.5,
                "height_cm": 180,
                "diagnosis": "Hypertension, Type 2 Diabetes",
                "comorbidities": "Obesity",
                "medications": "Metformin, Lisinopril",
                "allergies": "Penicillin",
                "mental_status": "stable",
                "primary_phone": "555-0101",
                "emergency_contact_name": "Jane Doe",
                "emergency_contact_phone": "555-0102",
                "emergency_contact_relationship": "Spouse",
                "address": "123 Main St",
                "city": "New York",
                "state": "NY",
                "pincode": "10001",
                "mrn": "MRN001",
                "admission_type": models.AdmissionType.planned,
                "patient_status": models.PatientStatus.admitted,
                "fall_risk": False,
                "infection_risk": False,
                "is_serious": False,
            },
            {
                "full_name": "Sarah Johnson",
                "age": 62,
                "gender": "F",
                "blood_group": "A+",
                "weight_kg": 68.0,
                "height_cm": 165,
                "diagnosis": "Acute Coronary Syndrome",
                "comorbidities": "Hypertension",
                "medications": "Aspirin, Beta-blocker, Statin",
                "allergies": "None",
                "mental_status": "anxious",
                "primary_phone": "555-0201",
                "emergency_contact_name": "Michael Johnson",
                "emergency_contact_phone": "555-0202",
                "emergency_contact_relationship": "Son",
                "address": "456 Oak Ave",
                "city": "Boston",
                "state": "MA",
                "pincode": "02101",
                "mrn": "MRN002",
                "admission_type": models.AdmissionType.emergency,
                "patient_status": models.PatientStatus.admitted,
                "fall_risk": True,
                "infection_risk": False,
                "is_serious": True,
            },
            {
                "full_name": "Robert Wilson",
                "age": 38,
                "gender": "M",
                "blood_group": "B+",
                "weight_kg": 82.3,
                "height_cm": 185,
                "diagnosis": "Pneumonia",
                "comorbidities": "Asthma",
                "medications": "Amoxicillin, Albuterol",
                "allergies": "Sulfa drugs",
                "mental_status": "stable",
                "primary_phone": "555-0301",
                "emergency_contact_name": "Lisa Wilson",
                "emergency_contact_phone": "555-0302",
                "emergency_contact_relationship": "Wife",
                "address": "789 Pine Rd",
                "city": "Chicago",
                "state": "IL",
                "pincode": "60601",
                "mrn": "MRN003",
                "admission_type": models.AdmissionType.transfer,
                "patient_status": models.PatientStatus.in_observation,
                "fall_risk": False,
                "infection_risk": True,
                "is_serious": False,
            },
            {
                "full_name": "Maria Garcia",
                "age": 55,
                "gender": "F",
                "blood_group": "AB-",
                "weight_kg": 70.0,
                "height_cm": 162,
                "diagnosis": "Post-surgical recovery",
                "comorbidities": "None",
                "medications": "Pain relief",
                "allergies": "Morphine",
                "mental_status": "stable",
                "primary_phone": "555-0401",
                "emergency_contact_name": "Carlos Garcia",
                "emergency_contact_phone": "555-0402",
                "emergency_contact_relationship": "Brother",
                "address": "321 Elm St",
                "city": "Los Angeles",
                "state": "CA",
                "pincode": "90001",
                "mrn": "MRN004",
                "admission_type": models.AdmissionType.planned,
                "patient_status": models.PatientStatus.admitted,
                "fall_risk": True,
                "infection_risk": False,
                "is_serious": False,
            },
        ]

        patients = []
        for data in patient_data:
            patient = models.Patient(**data)
            patient.uhid = models.Patient.generate_uhid()
            patients.append(patient)

        db.add_all(patients)
        db.commit()
        print(f"[OK] Created {len(patients)} patients with UHIDs")

        # Assign patients to beds
        available_beds = db.query(models.Bed).filter(models.Bed.status == models.BedStatus.available).all()
        for patient, bed in zip(patients, available_beds):
            bed.patient_id = patient.id
            bed.status = models.BedStatus.occupied
        db.commit()
        print(f"[OK] Assigned patients to beds")

        # Create vital readings for first patient
        vitals = []
        for i in range(5):
            vital = models.VitalReading(
                patient_id=patients[0].id,
                heart_rate=72 + (i * 2),
                spo2=98,
                blood_pressure_sys=120 + (i * 2),
                blood_pressure_dia=80 + i,
                temperature=37.0 + (i * 0.1),
                ecg_value=0.5 + (i * 0.05),
                recorded_at=datetime.now(timezone.utc) - timedelta(hours=5-i),
            )
            vitals.append(vital)
        db.add_all(vitals)
        db.commit()
        print(f"[OK] Created vital readings")

        # Create lab results
        labs = [
            models.LabResult(
                patient_id=patients[0].id,
                test_name="Blood Glucose",
                value=180.0,
                unit="mg/dL",
                reference_low=70,
                reference_high=100,
                is_abnormal=True,
                measured_at=datetime.now(timezone.utc) - timedelta(hours=2),
            ),
            models.LabResult(
                patient_id=patients[0].id,
                test_name="Hemoglobin A1c",
                value=8.5,
                unit="%",
                reference_low=0,
                reference_high=5.7,
                is_abnormal=True,
                measured_at=datetime.now(timezone.utc) - timedelta(hours=1),
            ),
        ]
        db.add_all(labs)
        db.commit()
        print(f"[OK] Created lab results")

        # Create alerts
        alerts = [
            models.Alert(
                patient_id=patients[1].id,
                severity=models.AlertSeverity.critical,
                message="Critical: High fever detected - 39.2°C",
                is_read=False,
            ),
            models.Alert(
                patient_id=patients[0].id,
                severity=models.AlertSeverity.warning,
                message="Warning: Blood glucose above target range",
                is_read=False,
            ),
        ]
        db.add_all(alerts)
        db.commit()
        print(f"[OK] Created alerts")

        # Print created UHIDs
        print("\n=== Created Patients with UHIDs ===")
        for patient in db.query(models.Patient).all():
            print(f"{patient.full_name}: {patient.uhid}")

        print("\n[OK] Database seeding completed successfully!")

    except Exception as e:
        print(f"[ERROR] Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
