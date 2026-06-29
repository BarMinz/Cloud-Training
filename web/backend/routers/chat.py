import asyncio
import json
import time
from typing import List, Set, Dict, Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from jose import JWTError

from database import get_db, SessionLocal
import models
import auth as auth_utils

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_LEN = 1000
HISTORY_LIMIT = 100
RATE_LIMIT_PER_10S = 8
VALID_STATUSES = {"active", "away", "dnd"}


class ConnectionManager:
    def __init__(self) -> None:
        self.by_user: Dict[int, Set[WebSocket]] = {}
        self.status_by_user: Dict[int, str] = {}
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, user_id: int) -> None:
        await ws.accept()
        async with self._lock:
            self.by_user.setdefault(user_id, set()).add(ws)
            self.status_by_user.setdefault(user_id, "active")

    async def disconnect(self, ws: WebSocket, user_id: int) -> None:
        async with self._lock:
            socks = self.by_user.get(user_id)
            if socks:
                socks.discard(ws)
                if not socks:
                    self.by_user.pop(user_id, None)
                    self.status_by_user.pop(user_id, None)

    def online_user_ids(self) -> List[int]:
        return sorted(self.by_user.keys())

    def status_map(self) -> Dict[str, str]:
        return {str(k): v for k, v in self.status_by_user.items()}

    def set_status(self, user_id: int, status: str) -> bool:
        if status not in VALID_STATUSES:
            return False
        if user_id not in self.by_user:
            return False
        self.status_by_user[user_id] = status
        return True

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        socks = list(self.by_user.get(user_id, set()))
        data = json.dumps(payload)
        for ws in socks:
            try:
                await ws.send_text(data)
            except Exception:
                pass

    async def broadcast(self, payload: dict) -> None:
        data = json.dumps(payload)
        for socks in list(self.by_user.values()):
            for ws in list(socks):
                try:
                    await ws.send_text(data)
                except Exception:
                    pass


manager = ConnectionManager()
_rate: Dict[int, List[float]] = {}


def _serialize(msg: models.ChatMessage) -> dict:
    return {
        "id": msg.id,
        "user_id": msg.user_id,
        "username": msg.username,
        "avatar": msg.avatar,
        "content": msg.content,
        "recipient_id": msg.recipient_id,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def _serialize_user(u: models.User, online_set, status_map) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "avatar": u.avatar,
        "role": u.role.value if hasattr(u.role, "value") else u.role,
        "online": u.id in online_set,
        "status": status_map.get(str(u.id), "offline" if u.id not in online_set else "active"),
    }


async def _broadcast_presence():
    await manager.broadcast({
        "type": "presence",
        "online_user_ids": manager.online_user_ids(),
        "status_by_id": manager.status_map(),
    })


@router.get("/users")
def list_users(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).order_by(models.User.username.asc()).all()
    online_set = set(manager.online_user_ids())
    status_map = manager.status_map()
    return [_serialize_user(u, online_set, status_map) for u in users if u.id != current_user.id]


@router.get("/history")
def public_history(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.recipient_id.is_(None))
        .order_by(models.ChatMessage.id.desc())
        .limit(HISTORY_LIMIT)
        .all()
    )
    rows.reverse()
    return [_serialize(r) for r in rows]


@router.get("/dm/{other_id}")
def dm_history(
    other_id: int,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    me = current_user.id
    rows = (
        db.query(models.ChatMessage)
        .filter(
            or_(
                and_(models.ChatMessage.user_id == me, models.ChatMessage.recipient_id == other_id),
                and_(models.ChatMessage.user_id == other_id, models.ChatMessage.recipient_id == me),
            )
        )
        .order_by(models.ChatMessage.id.desc())
        .limit(HISTORY_LIMIT)
        .all()
    )
    rows.reverse()
    return [_serialize(r) for r in rows]


@router.websocket("/ws")
async def chat_ws(ws: WebSocket, token: str = ""):
    if not token:
        await ws.close(code=4401)
        return
    try:
        payload = auth_utils.decode_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        await ws.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            await ws.close(code=4401)
            return
        username = user.username
        avatar = user.avatar
    finally:
        db.close()

    await manager.connect(ws, user_id)
    await _broadcast_presence()

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            mtype = msg.get("type")

            if mtype == "status":
                value = msg.get("value")
                if manager.set_status(user_id, value):
                    await _broadcast_presence()
                continue

            content = (msg.get("content") or "").strip()
            if not content:
                continue
            if len(content) > MAX_LEN:
                content = content[:MAX_LEN]

            to_raw = msg.get("to")
            recipient_id: Optional[int] = None
            if to_raw is not None:
                try:
                    recipient_id = int(to_raw)
                except (ValueError, TypeError):
                    continue
                if recipient_id == user_id:
                    continue

            now = time.time()
            bucket = _rate.setdefault(user_id, [])
            bucket[:] = [t for t in bucket if now - t < 10]
            if len(bucket) >= RATE_LIMIT_PER_10S:
                await ws.send_text(json.dumps({
                    "type": "error",
                    "message": "Slow down — too many messages.",
                }))
                continue
            bucket.append(now)

            db = SessionLocal()
            try:
                if recipient_id is not None:
                    exists = db.query(models.User).filter(models.User.id == recipient_id).first()
                    if not exists:
                        continue

                row = models.ChatMessage(
                    user_id=user_id,
                    username=username,
                    avatar=avatar,
                    content=content,
                    recipient_id=recipient_id,
                )
                db.add(row)
                db.commit()
                db.refresh(row)
                payload_out = {"type": "message", **_serialize(row)}
            finally:
                db.close()

            if recipient_id is None:
                await manager.broadcast(payload_out)
            else:
                await manager.send_to_user(recipient_id, payload_out)
                if recipient_id != user_id:
                    await manager.send_to_user(user_id, payload_out)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.disconnect(ws, user_id)
        try:
            await _broadcast_presence()
        except Exception:
            pass
