from app import models


def test_patient_create_allowed_for_doctor(client, user_factory, token_factory):
    user_factory("doc.user", "Pass@123", models.UserRole.doctor, "doc@example.com")
    doc_token = token_factory("doc.user", "Pass@123")

    response = client.post(
        "/patients/",
        json={"full_name": "Patient One", "diagnosis": "Observation"},
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert response.status_code == 201


def test_patient_create_forbidden_for_nurse(client, user_factory, token_factory):
    user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")
    nurse_token = token_factory("nurse.user", "Pass@123")

    response = client.post(
        "/patients/",
        json={"full_name": "Patient Two", "diagnosis": "Observation"},
        headers={"Authorization": f"Bearer {nurse_token}"},
    )
    assert response.status_code == 403


def test_patient_delete_forbidden_for_nurse(client, user_factory, token_factory):
    user_factory("doc.user", "Pass@123", models.UserRole.doctor, "doc@example.com")
    user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")

    doc_token = token_factory("doc.user", "Pass@123")
    nurse_token = token_factory("nurse.user", "Pass@123")

    created = client.post(
        "/patients/",
        json={"full_name": "Patient Three", "diagnosis": "Observation"},
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    patient_id = created.json()["id"]

    delete_res = client.delete(
        f"/patients/{patient_id}",
        headers={"Authorization": f"Bearer {nurse_token}"},
    )
    assert delete_res.status_code == 403


def test_task_create_allowed_for_nurse(client, user_factory, token_factory):
    user_factory("doc.user", "Pass@123", models.UserRole.doctor, "doc@example.com")
    user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")

    doc_token = token_factory("doc.user", "Pass@123")
    nurse_token = token_factory("nurse.user", "Pass@123")

    created = client.post(
        "/patients/",
        json={"full_name": "Patient Four", "diagnosis": "Observation"},
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    patient_id = created.json()["id"]

    task_res = client.post(
        "/tasks/",
        json={"patient_id": patient_id, "title": "Medication", "priority": 2},
        headers={"Authorization": f"Bearer {nurse_token}"},
    )
    assert task_res.status_code == 201
