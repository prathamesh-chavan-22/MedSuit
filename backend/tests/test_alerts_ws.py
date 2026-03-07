import pytest
from starlette.websockets import WebSocketDisconnect

from app import models


def test_alerts_ws_rejects_missing_token(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/alerts/ws"):
            pass


def test_alerts_ws_accepts_valid_token(client, user_factory, token_factory):
    user_factory("admin.user", "Pass@123", models.UserRole.admin, "admin@example.com")
    token = token_factory("admin.user", "Pass@123")

    with client.websocket_connect(f"/alerts/ws?token={token}") as ws:
        ws.close()
