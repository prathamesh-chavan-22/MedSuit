from app import models


def test_public_register_disabled(client):
    payload = {
        "username": "new.user",
        "full_name": "New User",
        "email": "new.user@example.com",
        "password": "Pass@123",
        "role": "nurse",
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 403
    assert "disabled" in response.json()["detail"].lower()


def test_admin_register_requires_auth(client):
    payload = {
        "username": "new.user",
        "full_name": "New User",
        "email": "new.user@example.com",
        "password": "Pass@123",
        "role": "nurse",
    }
    response = client.post("/auth/register/admin", json=payload)
    assert response.status_code == 401


def test_login_and_me_with_username(client, user_factory, token_factory):
    user_factory("rushil.dhube", "test@456", models.UserRole.admin, "rushil@example.com")
    token = token_factory("rushil.dhube", "test@456")

    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    body = me_res.json()
    assert body["username"] == "rushil.dhube"
    assert body["role"] == "admin"
