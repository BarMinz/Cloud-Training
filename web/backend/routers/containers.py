import asyncio
import fcntl
import json
import os
import pty
import socket
import struct
import subprocess
import termios
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from jose import JWTError
from sqlalchemy.orm import Session
from database import get_db
import auth as auth_utils
import models

router = APIRouter(prefix="/api/containers", tags=["containers"])

SECONDARY_IP = "79.108.163.9"
LAB_PORTS = (80, 443)


def container_name(user_id: int) -> str:
    return f"lamp-user-{user_id}"


def _run(cmd: list, timeout: int = 10) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def get_container_status(name: str) -> str:
    result = _run(['docker', 'inspect', '--format', '{{.State.Status}}', name])
    if result.returncode == 0:
        return result.stdout.strip()
    return 'not_found'


def _free_lab_ports() -> list[int]:
    """Return which of LAB_PORTS are not currently bound on SECONDARY_IP."""
    free = []
    for port in LAB_PORTS:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 0)
            try:
                s.bind((SECONDARY_IP, port))
                free.append(port)
            except OSError:
                pass
    return free


def _container_bound_ports(name: str) -> list[int]:
    """Return port numbers currently mapped to SECONDARY_IP for the given container."""
    result = _run(['docker', 'port', name])
    ports = []
    for line in result.stdout.splitlines():
        # e.g. "80/tcp -> 79.108.163.9:80"
        if SECONDARY_IP in line:
            try:
                ports.append(int(line.split('/')[0]))
            except (ValueError, IndexError):
                pass
    return sorted(ports)


def ensure_container_running(name: str) -> bool:
    status = get_container_status(name)
    if status == 'running':
        return True
    if status in ('exited', 'created', 'paused'):
        return _run(['docker', 'start', name]).returncode == 0
    if status == 'not_found':
        cmd = [
            'docker', 'run', '-d', '--name', name,
            '--hostname', 'lamp-server',
            '-e', 'TERM=xterm-256color',
            '--memory', '512m',
        ]
        for port in _free_lab_ports():
            cmd += ['-p', f'{SECONDARY_IP}:{port}:{port}']
        cmd += ['ubuntu:24.04', 'sleep', 'infinity']
        return _run(cmd, timeout=30).returncode == 0
    return False


@router.post("/lamp")
def start_lamp_container(current_user: models.User = Depends(auth_utils.get_current_user)):
    name = container_name(current_user.id)
    if not ensure_container_running(name):
        raise HTTPException(status_code=500, detail="Failed to start container")
    bound = _container_bound_ports(name)
    return {
        "status": get_container_status(name),
        "container": name,
        "public_ip": SECONDARY_IP if bound else None,
        "bound_ports": bound,
    }


@router.get("/lamp")
def get_lamp_status(current_user: models.User = Depends(auth_utils.get_current_user)):
    name = container_name(current_user.id)
    return {"status": get_container_status(name), "container": name}


@router.delete("/lamp")
def remove_lamp_container(current_user: models.User = Depends(auth_utils.get_current_user)):
    name = container_name(current_user.id)
    _run(['docker', 'rm', '-f', name])
    return {"status": "removed"}


@router.get("/admin/{user_id}/lamp")
def admin_get_lamp_status(
    user_id: int,
    admin: models.User = Depends(auth_utils.require_admin),
):
    name = container_name(user_id)
    return {"status": get_container_status(name), "container": name, "user_id": user_id}


@router.websocket("/admin/{user_id}/lamp/terminal")
async def admin_lamp_terminal(websocket: WebSocket, user_id: int, token: str = Query(...)):
    try:
        payload = auth_utils.decode_token(token)
        admin_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001)
        return

    # Verify the token holder is an admin
    from database import SessionLocal
    db = SessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.id == admin_id).first()
        if not admin_user or admin_user.role not in (models.UserRole.admin, models.UserRole.main_admin):
            await websocket.close(code=4003)
            return
    finally:
        db.close()

    name = container_name(user_id)
    loop = asyncio.get_event_loop()

    ok = await loop.run_in_executor(None, lambda: ensure_container_running(name))
    if not ok:
        await websocket.close(code=4002)
        return

    await websocket.accept()
    await _run_terminal_session(websocket, name=name, loop=loop)


async def _run_terminal_session(websocket: WebSocket, name: str, loop):
    """Shared PTY bridge logic used by both user and admin terminal endpoints."""
    master_fd, slave_fd = pty.openpty()
    proc = None
    try:
        proc = await asyncio.create_subprocess_exec(
            'docker', 'exec', '-it', name, '/bin/bash',
            stdin=slave_fd, stdout=slave_fd, stderr=slave_fd,
        )
        os.close(slave_fd)

        async def pty_to_ws():
            while True:
                try:
                    data = await loop.run_in_executor(None, lambda: os.read(master_fd, 4096))
                    if not data:
                        break
                    await websocket.send_bytes(data)
                except OSError:
                    break
                except Exception:
                    break

        async def ws_to_pty():
            while True:
                try:
                    msg = await websocket.receive()
                    if msg.get('type') == 'websocket.disconnect':
                        break
                    if msg.get('bytes'):
                        os.write(master_fd, msg['bytes'])
                    elif msg.get('text'):
                        try:
                            data = json.loads(msg['text'])
                            if data.get('type') == 'resize':
                                rows = max(1, int(data.get('rows', 24)))
                                cols = max(1, int(data.get('cols', 80)))
                                winsize = struct.pack('HHHH', rows, cols, 0, 0)
                                fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                        except Exception:
                            pass
                except WebSocketDisconnect:
                    break
                except Exception:
                    break

        pty_task = asyncio.ensure_future(pty_to_ws())
        ws_task = asyncio.ensure_future(ws_to_pty())
        await asyncio.wait([pty_task, ws_task], return_when=asyncio.FIRST_COMPLETED)

    finally:
        if proc and proc.returncode is None:
            try:
                proc.kill()
            except Exception:
                pass
        try:
            os.close(master_fd)
        except OSError:
            pass
        if proc:
            try:
                await asyncio.wait_for(proc.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                pass


@router.websocket("/lamp/terminal")
async def lamp_terminal(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = auth_utils.decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await websocket.close(code=4001)
        return

    name = container_name(user_id)
    loop = asyncio.get_event_loop()

    ok = await loop.run_in_executor(None, lambda: ensure_container_running(name))
    if not ok:
        await websocket.close(code=4002)
        return

    await websocket.accept()
    await _run_terminal_session(websocket, name=name, loop=loop)
