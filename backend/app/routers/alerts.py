import asyncio
import json
from typing import List, Set
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user, get_user_from_token
from app.database import get_db, SessionLocal

router = APIRouter(prefix="/alerts", tags=["Alerts"])

# ─── WebSocket connection manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active.discard(websocket)

    async def broadcast(self, data: dict):
        message = json.dumps(data)
        dead = set()
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        self.active -= dead


manager = ConnectionManager()


# ─── REST endpoints ───────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.AlertOut])
def list_alerts(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    query = db.query(models.Alert)
    if unread_only:
        query = query.filter(models.Alert.is_read == False)
    return query.order_by(models.Alert.created_at.desc()).limit(100).all()


@router.patch("/{alert_id}/read", response_model=schemas.AlertOut)
def mark_read(
    alert_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert


# ─── WebSocket endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws")
async def alerts_ws(websocket: WebSocket, token: str = Query(default="")):
    """
    Connect to receive real-time alert push notifications.
    The server polls for new unread alerts every 3 seconds and broadcasts them.
    """
    db: Session = SessionLocal()
    try:
        current_user = get_user_from_token(db, token)
    finally:
        db.close()

    if not current_user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket)
    try:
        last_seen_id = 0
        while True:
            await asyncio.sleep(3)
            db: Session = SessionLocal()
            try:
                new_alerts = (
                    db.query(models.Alert)
                    .filter(models.Alert.id > last_seen_id, models.Alert.is_read == False)
                    .order_by(models.Alert.id.asc())
                    .all()
                )
                for alert in new_alerts:
                    payload = {
                        "id": alert.id,
                        "patient_id": alert.patient_id,
                        "severity": alert.severity,
                        "message": alert.message,
                        "created_at": str(alert.created_at),
                    }
                    await manager.broadcast(payload)
                    last_seen_id = max(last_seen_id, alert.id)
            finally:
                db.close()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
