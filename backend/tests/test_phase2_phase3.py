from app import models


def test_clinical_note_draft_from_latest_audio(client, user_factory, token_factory, db_session):
    doctor = user_factory("doc.user", "Pass@123", models.UserRole.doctor, "doc@example.com")
    token = token_factory("doc.user", "Pass@123")

    patient = models.Patient(full_name="Patient Notes")
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    audio = models.AudioNote(
        patient_id=patient.id,
        recorded_by=doctor.id,
        audio_file_path="uploads/audio/demo.webm",
        transcript="Patient reports chest discomfort after walking.",
    )
    db_session.add(audio)
    db_session.commit()

    response = client.post(
        f"/clinical-notes/patients/{patient.id}/draft-from-latest-audio",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert "Patient reports" in body["subjective"]


def test_lab_summary_endpoint(client, user_factory, token_factory, db_session):
    user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")
    token = token_factory("nurse.user", "Pass@123")

    patient = models.Patient(full_name="Patient Labs")
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    post1 = client.post(
        f"/labs/patients/{patient.id}",
        json={
            "test_name": "CRP",
            "value": 12.0,
            "unit": "mg/L",
            "reference_low": 0.0,
            "reference_high": 5.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert post1.status_code == 201

    post2 = client.post(
        f"/labs/patients/{patient.id}",
        json={
            "test_name": "CRP",
            "value": 8.0,
            "unit": "mg/L",
            "reference_low": 0.0,
            "reference_high": 5.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert post2.status_code == 201

    summary = client.get(
        f"/labs/patients/{patient.id}/summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert summary.status_code == 200
    rows = summary.json()
    assert len(rows) == 1
    assert rows[0]["test_name"] == "CRP"
    assert rows[0]["is_abnormal"] is True


def test_timeline_includes_multiple_event_types(client, user_factory, token_factory, db_session):
    doctor = user_factory("doc.user", "Pass@123", models.UserRole.doctor, "doc@example.com")
    token = token_factory("doc.user", "Pass@123")

    patient = models.Patient(full_name="Timeline Patient", is_serious=True)
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    db_session.add(
        models.Alert(patient_id=patient.id, severity=models.AlertSeverity.warning, message="Low SpO2")
    )
    db_session.add(
        models.Task(patient_id=patient.id, title="Check oxygen", status=models.TaskStatus.pending, priority=3)
    )
    db_session.add(
        models.VitalReading(patient_id=patient.id, heart_rate=102, spo2=92, temperature=37.9)
    )
    db_session.add(
        models.AudioNote(
            patient_id=patient.id,
            recorded_by=doctor.id,
            audio_file_path="uploads/audio/timeline.webm",
            transcript="Patient has mild dyspnea.",
        )
    )
    db_session.commit()

    response = client.get(
        f"/patients/{patient.id}/timeline",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    events = response.json()
    event_types = {evt["event_type"] for evt in events}
    assert "alert" in event_types
    assert "task" in event_types
    assert "vital" in event_types
    assert "audio_note" in event_types