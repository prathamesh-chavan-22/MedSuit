from datetime import datetime, timedelta, timezone

from app import models


def test_audio_upload_requires_active_consent(client, user_factory, token_factory, db_session):
    user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")
    token = token_factory("nurse.user", "Pass@123")

    patient = models.Patient(full_name="Patient A")
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    response = client.post(
        f"/audio/{patient.id}",
        files={"file": ("test.webm", b"fake-audio", "audio/webm")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert "consent" in response.json()["detail"].lower()


def test_audio_upload_succeeds_with_active_consent(client, user_factory, token_factory, db_session):
    nurse = user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")
    token = token_factory("nurse.user", "Pass@123")

    patient = models.Patient(full_name="Patient B")
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    consent = models.Consent(
        patient_id=patient.id,
        status=models.ConsentStatus.active,
        basis="clinical-care",
        captured_by=nurse.id,
    )
    db_session.add(consent)
    db_session.commit()

    response = client.post(
        f"/audio/{patient.id}",
        files={"file": ("test.webm", b"fake-audio", "audio/webm")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201


def test_rounding_priorities_returns_ranked_patients(client, user_factory, token_factory, db_session):
    user_factory("doc.user", "Pass@123", models.UserRole.doctor, "doc@example.com")
    token = token_factory("doc.user", "Pass@123")

    p1 = models.Patient(full_name="High Risk", is_serious=True)
    p2 = models.Patient(full_name="Lower Risk", is_serious=False)
    db_session.add_all([p1, p2])
    db_session.commit()
    db_session.refresh(p1)
    db_session.refresh(p2)

    db_session.add(
        models.Alert(
            patient_id=p1.id,
            severity=models.AlertSeverity.critical,
            message="Critical alert",
            is_read=False,
        )
    )
    db_session.add(
        models.Task(
            patient_id=p1.id,
            title="Urgent medication",
            status=models.TaskStatus.pending,
            priority=3,
            due_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
    )
    db_session.add(
        models.VitalReading(
            patient_id=p1.id,
            heart_rate=120,
            spo2=90,
            temperature=39.1,
        )
    )
    db_session.commit()

    response = client.get(
        "/rounding/priorities?limit=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) >= 1
    assert rows[0]["patient_name"] == "High Risk"
    assert rows[0]["score"] > 0
    assert len(rows[0]["reasons"]) > 0
