from app import models


def test_admin_can_list_users(client, user_factory, token_factory):
    user_factory("admin.user", "Pass@123", models.UserRole.admin, "admin@example.com")
    user_factory("doctor.user", "Pass@123", models.UserRole.doctor, "doctor@example.com")

    admin_token = token_factory("admin.user", "Pass@123")
    response = client.get("/auth/users", headers={"Authorization": f"Bearer {admin_token}"})

    assert response.status_code == 200
    usernames = [u["username"] for u in response.json()]
    assert "admin.user" in usernames
    assert "doctor.user" in usernames


def test_non_admin_cannot_list_users(client, user_factory, token_factory):
    user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")

    nurse_token = token_factory("nurse.user", "Pass@123")
    response = client.get("/auth/users", headers={"Authorization": f"Bearer {nurse_token}"})

    assert response.status_code == 403


def test_admin_can_update_user_role_and_status(client, user_factory, token_factory):
    admin = user_factory("admin.user", "Pass@123", models.UserRole.admin, "admin@example.com")
    nurse = user_factory("nurse.user", "Pass@123", models.UserRole.nurse, "nurse@example.com")

    admin_token = token_factory("admin.user", "Pass@123")
    response = client.patch(
        f"/auth/users/{nurse.id}",
        json={"role": "doctor", "is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "doctor"
    assert body["is_active"] is False



def test_admin_cannot_deactivate_self(client, user_factory, token_factory):
    admin = user_factory("admin.user", "Pass@123", models.UserRole.admin, "admin@example.com")
    admin_token = token_factory("admin.user", "Pass@123")

    response = client.patch(
        f"/auth/users/{admin.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 400
    assert "deactivate" in response.json()["detail"].lower()
