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


def test_refresh_and_logout_session_flow(client, user_factory):
    user_factory("session.user", "Pass@123", models.UserRole.doctor, "session.user@example.com")

    login_res = client.post(
        "/auth/login",
        data={"username": "session.user", "password": "Pass@123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_res.status_code == 200
    login_body = login_res.json()
    assert login_body["refresh_token"]
    assert login_body["session_id"]

    refresh_res = client.post("/auth/refresh", json={"refresh_token": login_body["refresh_token"]})
    assert refresh_res.status_code == 200
    refresh_body = refresh_res.json()
    assert refresh_body["access_token"]
    assert refresh_body["refresh_token"]
    assert refresh_body["session_id"] == login_body["session_id"]

    logout_res = client.post(
        "/auth/logout",
        json={"session_id": login_body["session_id"]},
        headers={"Authorization": f"Bearer {refresh_body['access_token']}"},
    )
    assert logout_res.status_code == 204

    refresh_again = client.post("/auth/refresh", json={"refresh_token": refresh_body["refresh_token"]})
    assert refresh_again.status_code == 401
