"""Seed database with rich, realistic test data.

This script is designed to populate the MedSuite database with enough data
to thoroughly test the UI and API at realistic scale:
  - 10 patients across 3 wards
  - 3 shifts
  - 80-100 tasks per patient (mix of statuses)
  - 70-90 medication intakes per patient (past administered + future scheduled)
  - 40-50 food intakes per patient
  - realistic vital readings (5 per patient)
  - lab results
  - alerts (one per active condition, honouring the new dedup model)
"""
from datetime import datetime, timedelta, timezone
import random
from app.database import SessionLocal
from app import models


def hash_password(password: str) -> str:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)


# ─── Lookup data ──────────────────────────────────────────────────────────────

TASK_TEMPLATES = [
    ("Administer Morning Medications", "Give prescribed oral medications with breakfast", 3),
    ("Check IV Line", "Inspect IV cannula site for signs of phlebitis or infiltration", 2),
    ("Monitor Blood Pressure", "Record BP every 4 hours as per orders", 2),
    ("Wound Dressing Change", "Change surgical wound dressing using aseptic technique", 3),
    ("Patient Physiotherapy", "Assist patient with prescribed range-of-motion exercises", 2),
    ("Oxygen Saturation Check", "Record SpO2 and document in chart", 1),
    ("Patient Education Session", "Educate patient about discharge instructions", 2),
    ("Fluid Balance Chart Update", "Record all inputs and outputs for the shift", 1),
    ("Blood Glucose Monitoring", "Check capillary blood glucose before meals", 2),
    ("ECG Recording", "Perform 12-lead ECG as ordered by physician", 3),
    ("Catheter Care", "Perform urinary catheter care and hygiene", 2),
    ("Pain Assessment", "Assess pain level using VAS scale and document", 1),
    ("Administer IV Antibiotics", "Prepare and administer IV antibiotic as per schedule", 3),
    ("Ensure Patient Comfort", "Reposition patient to prevent pressure sores", 1),
    ("Pharmacy Medication Review", "Coordinate with pharmacy for medication reconciliation", 2),
    ("Pre-operative Preparation", "Prepare surgical consent and NPO instructions", 3),
    ("Respiratory Nebulization", "Administer nebulization treatment as prescribed", 2),
    ("Urine Sample Collection", "Collect midstream urine for culture and sensitivity", 2),
    ("Patient Ambulation", "Assist patient with supervised walking in corridor", 2),
    ("Administer Evening Medications", "Give prescribed evening medications", 3),
    ("Night Vitals check", "Record vitals at 2am as per ICU protocol", 2),
    ("Family Meeting Documentation", "Document outcomes of family conference", 1),
    ("Restraint Assessment", "Reassess need for physical restraints every 2 hours", 3),
    ("Swallowing Assessment", "Arrange speech therapy swallow screen", 2),
    ("Pressure Ulcer Assessment", "Document Braden score for pressure ulcer risk", 2),
]

MEDICATION_TEMPLATES = [
    ("Metformin", "500mg", "oral"),
    ("Lisinopril", "10mg", "oral"),
    ("Aspirin", "75mg", "oral"),
    ("Atorvastatin", "20mg", "oral"),
    ("Amlodipine", "5mg", "oral"),
    ("Pantoprazole", "40mg", "oral"),
    ("Metoprolol", "25mg", "oral"),
    ("Amoxicillin", "500mg", "oral"),
    ("Ceftriaxone", "1g", "IV"),
    ("Heparin", "5000 units", "subcutaneous"),
    ("Paracetamol", "500mg", "oral"),
    ("Tramadol", "50mg", "oral"),
    ("Furosemide", "40mg", "oral"),
    ("Enoxaparin", "40mg", "subcutaneous"),
    ("Ondansetron", "4mg", "IV"),
    ("Dexamethasone", "4mg", "IV"),
    ("Insulin (Regular)", "8 units", "subcutaneous"),
    ("Albuterol MDI", "2 puffs", "inhalation"),
    ("Budesonide", "200mcg", "inhalation"),
    ("Vitamin D3", "60000 IU", "oral"),
    ("Amikacin", "500mg", "IV"),
    ("Piperacillin-Tazobactam", "4.5g", "IV"),
    ("Potassium Chloride", "20 mEq", "IV"),
    ("Sodium Chloride 0.9%", "1000 mL", "IV"),
    ("Dextrose 5%", "500 mL", "IV"),
    ("Omeprazole", "20mg", "oral"),
    ("Losartan", "50mg", "oral"),
    ("Rosuvastatin", "10mg", "oral"),
    ("Clonidine", "0.1mg", "oral"),
    ("Midazolam", "2mg", "IV"),
]

FOOD_TEMPLATES = [
    ("Rice and Dal", "1 bowl", "lunch", 350),
    ("Clear Vegetable Soup", "200ml", "dinner", 60),
    ("Upma", "1 plate", "breakfast", 220),
    ("Soft Roti with Sabzi", "2 rotis", "lunch", 300),
    ("Fruit Bowl", "1 bowl", "snack", 120),
    ("Khichdi", "1 bowl", "lunch", 280),
    ("Boiled Eggs", "2 eggs", "breakfast", 140),
    ("Oats Porridge", "1 bowl", "breakfast", 180),
    ("Banana Milkshake", "200ml", "snack", 200),
    ("Steamed Idli with Sambar", "3 idlis", "breakfast", 190),
    ("Curd Rice", "1 bowl", "lunch", 250),
    ("Bread and Butter", "2 slices", "breakfast", 160),
    ("Clear Chicken Broth", "150ml", "dinner", 45),
    ("Soft Banana", "1 banana", "snack", 90),
    ("Green Tea", "1 cup", "snack", 5),
]

PATIENT_DATA = [
    {
        "full_name": "John Doe",
        "age": 45, "gender": "M", "blood_group": "O+",
        "weight_kg": 75.5, "height_cm": 180,
        "diagnosis": "Hypertension, Type 2 Diabetes",
        "comorbidities": "Obesity",
        "medications": "Metformin, Lisinopril",
        "allergies": "Penicillin",
        "mental_status": "stable",
        "primary_phone": "555-0101",
        "emergency_contact_name": "Jane Doe",
        "emergency_contact_phone": "555-0102",
        "emergency_contact_relationship": "Spouse",
        "address": "123 Main St", "city": "New York", "state": "NY", "pincode": "10001",
        "mrn": "MRN001",
        "admission_type": models.AdmissionType.planned,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": False, "infection_risk": False, "is_serious": False,
    },
    {
        "full_name": "Sarah Johnson",
        "age": 62, "gender": "F", "blood_group": "A+",
        "weight_kg": 68.0, "height_cm": 165,
        "diagnosis": "Acute Coronary Syndrome",
        "comorbidities": "Hypertension",
        "medications": "Aspirin, Beta-blocker, Statin",
        "allergies": "None",
        "mental_status": "anxious",
        "primary_phone": "555-0201",
        "emergency_contact_name": "Michael Johnson",
        "emergency_contact_phone": "555-0202",
        "emergency_contact_relationship": "Son",
        "address": "456 Oak Ave", "city": "Boston", "state": "MA", "pincode": "02101",
        "mrn": "MRN002",
        "admission_type": models.AdmissionType.emergency,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": True, "infection_risk": False, "is_serious": True,
    },
    {
        "full_name": "Robert Wilson",
        "age": 38, "gender": "M", "blood_group": "B+",
        "weight_kg": 82.3, "height_cm": 185,
        "diagnosis": "Community Acquired Pneumonia",
        "comorbidities": "Asthma",
        "medications": "Amoxicillin, Albuterol",
        "allergies": "Sulfa drugs",
        "mental_status": "stable",
        "primary_phone": "555-0301",
        "emergency_contact_name": "Lisa Wilson",
        "emergency_contact_phone": "555-0302",
        "emergency_contact_relationship": "Wife",
        "address": "789 Pine Rd", "city": "Chicago", "state": "IL", "pincode": "60601",
        "mrn": "MRN003",
        "admission_type": models.AdmissionType.transfer,
        "patient_status": models.PatientStatus.in_observation,
        "fall_risk": False, "infection_risk": True, "is_serious": False,
    },
    {
        "full_name": "Maria Garcia",
        "age": 55, "gender": "F", "blood_group": "AB-",
        "weight_kg": 70.0, "height_cm": 162,
        "diagnosis": "Post-surgical recovery (Laparoscopic Cholecystectomy)",
        "comorbidities": "None",
        "medications": "Paracetamol, Pantoprazole",
        "allergies": "Morphine",
        "mental_status": "stable",
        "primary_phone": "555-0401",
        "emergency_contact_name": "Carlos Garcia",
        "emergency_contact_phone": "555-0402",
        "emergency_contact_relationship": "Brother",
        "address": "321 Elm St", "city": "Los Angeles", "state": "CA", "pincode": "90001",
        "mrn": "MRN004",
        "admission_type": models.AdmissionType.planned,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": True, "infection_risk": False, "is_serious": False,
    },
    {
        "full_name": "Arjun Mehta",
        "age": 30, "gender": "M", "blood_group": "B-",
        "weight_kg": 68.0, "height_cm": 175,
        "diagnosis": "Acute Kidney Injury",
        "comorbidities": "Type 1 Diabetes",
        "medications": "Insulin, IV Fluids",
        "allergies": "Contrast dye",
        "mental_status": "confused",
        "primary_phone": "555-0501",
        "emergency_contact_name": "Priya Mehta",
        "emergency_contact_phone": "555-0502",
        "emergency_contact_relationship": "Mother",
        "address": "88 Sector 5", "city": "Mumbai", "state": "MH", "pincode": "400001",
        "mrn": "MRN005",
        "admission_type": models.AdmissionType.emergency,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": True, "infection_risk": False, "is_serious": True,
    },
    {
        "full_name": "Fatima Al-Rashid",
        "age": 72, "gender": "F", "blood_group": "O-",
        "weight_kg": 58.0, "height_cm": 155,
        "diagnosis": "Hip Fracture (post ORIF)",
        "comorbidities": "Osteoporosis, Atrial Fibrillation",
        "medications": "Warfarin, Calcium, Vitamin D",
        "allergies": "NSAIDs",
        "mental_status": "stable",
        "primary_phone": "555-0601",
        "emergency_contact_name": "Hassan Al-Rashid",
        "emergency_contact_phone": "555-0602",
        "emergency_contact_relationship": "Son",
        "address": "12 Crescent Lane", "city": "Dubai", "state": "DU", "pincode": "00000",
        "mrn": "MRN006",
        "admission_type": models.AdmissionType.emergency,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": True, "infection_risk": False, "is_serious": False,
    },
    {
        "full_name": "Liam O'Brien",
        "age": 25, "gender": "M", "blood_group": "A-",
        "weight_kg": 78.0, "height_cm": 182,
        "diagnosis": "Appendicitis (post appendectomy)",
        "comorbidities": "None",
        "medications": "Ceftriaxone, Metronidazole",
        "allergies": "None",
        "mental_status": "stable",
        "primary_phone": "555-0701",
        "emergency_contact_name": "Siobhan O'Brien",
        "emergency_contact_phone": "555-0702",
        "emergency_contact_relationship": "Mother",
        "address": "5 Maple Drive", "city": "Dublin", "state": "DUB", "pincode": "D01",
        "mrn": "MRN007",
        "admission_type": models.AdmissionType.emergency,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": False, "infection_risk": True, "is_serious": False,
    },
    {
        "full_name": "Mei Ling Zhang",
        "age": 48, "gender": "F", "blood_group": "AB+",
        "weight_kg": 55.0, "height_cm": 158,
        "diagnosis": "Stroke (Ischemic)",
        "comorbidities": "Hypertension, Hyperlipidemia",
        "medications": "Aspirin, Clopidogrel, Atorvastatin",
        "allergies": "Codeine",
        "mental_status": "agitated",
        "primary_phone": "555-0801",
        "emergency_contact_name": "Wei Zhang",
        "emergency_contact_phone": "555-0802",
        "emergency_contact_relationship": "Husband",
        "address": "32 Jade Blvd", "city": "Singapore", "state": "SG", "pincode": "018989",
        "mrn": "MRN008",
        "admission_type": models.AdmissionType.emergency,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": True, "infection_risk": False, "is_serious": True,
    },
    {
        "full_name": "Carlos Fernandez",
        "age": 65, "gender": "M", "blood_group": "O+",
        "weight_kg": 90.0, "height_cm": 178,
        "diagnosis": "COPD Exacerbation",
        "comorbidities": "Heart Failure, Hypertension",
        "medications": "Budesonide, Furosemide, Spironolactone",
        "allergies": "Erythromycin",
        "mental_status": "stable",
        "primary_phone": "555-0901",
        "emergency_contact_name": "Rosa Fernandez",
        "emergency_contact_phone": "555-0902",
        "emergency_contact_relationship": "Wife",
        "address": "78 Via Roma", "city": "Madrid", "state": "MAD", "pincode": "28001",
        "mrn": "MRN009",
        "admission_type": models.AdmissionType.planned,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": False, "infection_risk": False, "is_serious": True,
    },
    {
        "full_name": "Ananya Sharma",
        "age": 19, "gender": "F", "blood_group": "B+",
        "weight_kg": 52.0, "height_cm": 160,
        "diagnosis": "Dengue Fever with Thrombocytopenia",
        "comorbidities": "None",
        "medications": "Paracetamol, IV Fluids",
        "allergies": "None",
        "mental_status": "stable",
        "primary_phone": "555-1001",
        "emergency_contact_name": "Ramesh Sharma",
        "emergency_contact_phone": "555-1002",
        "emergency_contact_relationship": "Father",
        "address": "11 Park Street", "city": "Delhi", "state": "DL", "pincode": "110001",
        "mrn": "MRN010",
        "admission_type": models.AdmissionType.emergency,
        "patient_status": models.PatientStatus.admitted,
        "fall_risk": False, "infection_risk": True, "is_serious": False,
    },
]


def seed_database():
    from app.database import engine, Base
    # Recreate tables to start clean (optional — comment out to preserve existing data)
    # Base.metadata.drop_all(bind=engine)
    # Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        # ── Users ────────────────────────────────────────────────────────────
        user_specs = [
            dict(username="admin",      full_name="Admin User",   email="admin@medsuite.local",  password="admin123",    role=models.UserRole.admin),
            dict(username="dr_smith",   full_name="Dr. Smith",    email="smith@medsuite.local",  password="password123", role=models.UserRole.doctor),
            dict(username="dr_patel",   full_name="Dr. Patel",    email="patel@medsuite.local",  password="password123", role=models.UserRole.doctor),
            dict(username="nurse_john", full_name="John Nurse",   email="john@medsuite.local",   password="password123", role=models.UserRole.nurse),
            dict(username="nurse_priya",full_name="Priya Nurse",  email="priya@medsuite.local",  password="password123", role=models.UserRole.nurse),
            dict(username="nurse_aisha",full_name="Aisha Nurse",  email="aisha@medsuite.local",  password="password123", role=models.UserRole.nurse),
        ]
        users = []
        for spec in user_specs:
            u = db.query(models.User).filter(models.User.username == spec["username"]).first()
            if not u:
                u = models.User(
                    username=spec["username"],
                    full_name=spec["full_name"],
                    email=spec["email"],
                    hashed_password=hash_password(spec["password"]),
                    role=spec["role"],
                )
                db.add(u)
                db.flush()
            users.append(u)
        db.commit()
        [db.refresh(u) for u in users]
        nurse_users = [u for u in users if u.role == models.UserRole.nurse]
        print(f"[OK] Users ready: {len(users)}")

        # ── Shifts ───────────────────────────────────────────────────────────
        shift_specs = [
            ("Morning", "06:00", "14:00"),
            ("Evening", "14:00", "22:00"),
            ("Night",   "22:00", "06:00"),
        ]
        shifts = []
        for name, start, end in shift_specs:
            s = db.query(models.Shift).filter(models.Shift.name == name).first()
            if not s:
                s = models.Shift(name=name, start_time=start, end_time=end)
                db.add(s)
                db.flush()
            shifts.append(s)
        db.commit()
        [db.refresh(s) for s in shifts]
        print(f"[OK] Shifts ready: {len(shifts)}")

        # ── Beds ─────────────────────────────────────────────────────────────
        bed_specs = [
            (ward, f"{ward}-{n:02d}")
            for ward in ["ICU", "General", "Cardiology", "Orthopedics"]
            for n in range(1, 5)
        ]
        beds = []
        for ward, bed_number in bed_specs:
            b = db.query(models.Bed).filter(models.Bed.bed_number == bed_number).first()
            if not b:
                b = models.Bed(bed_number=bed_number, ward=ward, status=models.BedStatus.available)
                db.add(b)
                db.flush()
            beds.append(b)
        db.commit()
        [db.refresh(b) for b in beds]
        print(f"[OK] Beds ready: {len(beds)}")

        # ── Patients ─────────────────────────────────────────────────────────
        patients = []
        for data in PATIENT_DATA:
            p = db.query(models.Patient).filter(models.Patient.mrn == data["mrn"]).first()
            if not p:
                p = models.Patient(**data)
                p.uhid = models.Patient.generate_uhid()
                db.add(p)
                db.flush()
            patients.append(p)
        db.commit()
        [db.refresh(p) for p in patients]
        print(f"[OK] Patients ready: {len(patients)}")

        # Assign to beds (only if not already occupied)
        for patient, bed in zip(patients, beds):
            if bed.patient_id is None:
                bed.patient_id = patient.id
                bed.status = models.BedStatus.occupied
        db.commit()
        print("[OK] Bed assignments done")

        # ── Vital Readings ────────────────────────────────────────────────────
        vital_count = 0
        for patient in patients:
            for i in range(10):
                vital = models.VitalReading(
                    patient_id=patient.id,
                    heart_rate=random.randint(62, 100),
                    spo2=random.randint(95, 100),
                    blood_pressure_sys=random.randint(110, 140),
                    blood_pressure_dia=random.randint(65, 90),
                    temperature=round(random.uniform(36.5, 37.8), 1),
                    ecg_value=round(random.uniform(-0.5, 0.5), 3),
                    recorded_at=now - timedelta(hours=10 - i),
                )
                db.add(vital)
                vital_count += 1
        db.commit()
        print(f"[OK] Created {vital_count} vital readings")

        # ── Lab Results ───────────────────────────────────────────────────────
        lab_templates = [
            ("Blood Glucose",      random.uniform(80, 200),  "mg/dL",  70,   100),
            ("Hemoglobin A1c",     random.uniform(5, 9),     "%",      0,    5.7),
            ("Serum Creatinine",   random.uniform(0.8, 3.0), "mg/dL",  0.6,  1.2),
            ("Hemoglobin",         random.uniform(8, 15),    "g/dL",   12,   17),
            ("Platelet Count",     random.uniform(50, 400),  "k/uL",   150,  400),
            ("WBC Count",          random.uniform(4, 20),    "k/uL",   4,    10),
            ("Sodium",             random.uniform(130, 148), "mEq/L",  136,  145),
            ("Potassium",          random.uniform(3.0, 6.0), "mEq/L",  3.5,  5.0),
        ]
        lab_count = 0
        for patient in patients:
            for test_name, value, unit, ref_low, ref_high in lab_templates:
                value = round(value, 2)
                db.add(models.LabResult(
                    patient_id=patient.id,
                    test_name=test_name,
                    value=value,
                    unit=unit,
                    reference_low=ref_low,
                    reference_high=ref_high,
                    is_abnormal=(value < ref_low or value > ref_high),
                    measured_at=now - timedelta(hours=random.randint(1, 24)),
                ))
                lab_count += 1
        db.commit()
        print(f"[OK] Created {lab_count} lab results")

        # ── Tasks — 80-100 per patient ────────────────────────────────────────
        task_count = 0
        statuses = [models.TaskStatus.pending, models.TaskStatus.in_progress, models.TaskStatus.done]
        status_weights = [0.30, 0.20, 0.50]   # roughly half done, rest active
        for patient in patients:
            num_tasks = random.randint(80, 100)
            for i in range(num_tasks):
                template = random.choice(TASK_TEMPLATES)
                title, description, priority = template
                status = random.choices(statuses, weights=status_weights, k=1)[0]
                # Spread tasks across the past 30 days + 7 future days
                offset_days = random.randint(-30, 7)
                due_at = now + timedelta(days=offset_days, hours=random.randint(0, 23))
                db.add(models.Task(
                    patient_id=patient.id,
                    assigned_to=random.choice(nurse_users).id,
                    shift_id=random.choice(shifts).id,
                    title=title,
                    description=description,
                    status=status,
                    priority=priority,
                    due_at=due_at,
                    created_at=due_at - timedelta(hours=random.randint(1, 8)),
                ))
                task_count += 1
        db.commit()
        print(f"[OK] Created {task_count} tasks across {len(patients)} patients")

        # ── Medication Intakes — 70-90 per patient ────────────────────────────
        med_count = 0
        for patient in patients:
            num_meds = random.randint(70, 90)
            for i in range(num_meds):
                med_name, dosage, route = random.choice(MEDICATION_TEMPLATES)
                # 80% in the past (administered), 20% in the future (scheduled)
                if random.random() < 0.80:
                    taken_at = now - timedelta(hours=random.randint(1, 30 * 24))
                    is_scheduled = False
                    scheduled_at = None
                else:
                    future_hours = random.randint(1, 7 * 24)
                    taken_at = now + timedelta(hours=future_hours)
                    is_scheduled = True
                    scheduled_at = taken_at
                db.add(models.MedicationIntake(
                    patient_id=patient.id,
                    medication_name=med_name,
                    dosage=dosage,
                    route=route,
                    taken_at=taken_at,
                    scheduled_at=scheduled_at,
                    is_scheduled=is_scheduled,
                    notes=None,
                ))
                med_count += 1
        db.commit()
        print(f"[OK] Created {med_count} medication intake records across {len(patients)} patients")

        # ── Food Intakes — 40-50 per patient ─────────────────────────────────
        food_count = 0
        for patient in patients:
            num_meals = random.randint(40, 50)
            for i in range(num_meals):
                food_item, quantity, meal_type, calories = random.choice(FOOD_TEMPLATES)
                taken_at = now - timedelta(hours=random.randint(1, 7 * 24))
                db.add(models.FoodIntake(
                    patient_id=patient.id,
                    food_item=food_item,
                    quantity=quantity,
                    meal_type=meal_type,
                    calories=float(calories),
                    taken_at=taken_at,
                ))
                food_count += 1
        db.commit()
        print(f"[OK] Created {food_count} food intake records across {len(patients)} patients")

        # ── Alerts — one per active condition (honouring dedup model) ─────────
        sample_alerts = [
            (patients[1].id, models.AlertSeverity.critical, "Abnormal heart rate: 112 bpm"),
            (patients[1].id, models.AlertSeverity.warning,  "Fever detected: 38.8°C"),
            (patients[0].id, models.AlertSeverity.warning,  "Abnormal heart rate: 105 bpm"),
            (patients[4].id, models.AlertSeverity.critical, "Low SpO2: 88%"),
            (patients[7].id, models.AlertSeverity.critical, "Fever detected: 39.7°C"),
            (patients[8].id, models.AlertSeverity.warning,  "Low SpO2: 92%"),
        ]
        for patient_id, severity, message in sample_alerts:
            db.add(models.Alert(patient_id=patient_id, severity=severity, message=message, is_read=False))
        db.commit()
        print(f"[OK] Created {len(sample_alerts)} alerts (one per condition — dedup model)")

        # ── Summary ───────────────────────────────────────────────────────────
        print("\n=== Database Seeding Complete ===")
        print(f"  Users         : {len(users)}")
        print(f"  Shifts        : {len(shifts)}")
        print(f"  Beds          : {len(beds)}")
        print(f"  Patients      : {len(patients)}")
        print(f"  Vital readings: {vital_count}")
        print(f"  Lab results   : {lab_count}")
        print(f"  Tasks         : {task_count}")
        print(f"  Medications   : {med_count}")
        print(f"  Food intakes  : {food_count}")
        print(f"  Alerts (seed) : {len(sample_alerts)}")
        print("\nCreated patients:")
        for p in patients:
            print(f"  {p.full_name:<25} UHID: {p.uhid}")

    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
