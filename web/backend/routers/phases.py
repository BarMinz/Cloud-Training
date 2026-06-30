import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/phases", tags=["phases"])

MAX_REVISIONS = 20


def _serialize(p: models.Phase) -> dict:
    def _j(s, default):
        try:
            return json.loads(s) if s else default
        except Exception:
            return default
    return {
        "id": p.id,
        "title": p.title or "",
        "subtitle": p.subtitle or "",
        "icon": p.icon or "",
        "color": p.color or "",
        "accent": p.accent or "",
        "difficulty": p.difficulty or "",
        "estimatedTime": p.estimated_time or "",
        "description": p.description or "",
        "objectives": _j(p.objectives, []),
        "tasks": _j(p.tasks, []),
        "tips": _j(p.tips, []),
    }


class TaskItem(BaseModel):
    id: Optional[str] = None
    label: str = ""


class PhaseUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    accent: Optional[str] = None
    difficulty: Optional[str] = None
    estimatedTime: Optional[str] = Field(None, alias="estimatedTime")
    description: Optional[str] = None
    objectives: Optional[List[str]] = None
    tasks: Optional[List[TaskItem]] = None
    tips: Optional[List[str]] = None

    class Config:
        populate_by_name = True


@router.get("/")
def list_phases(db: Session = Depends(get_db)):
    rows = db.query(models.Phase).order_by(models.Phase.id.asc()).all()
    return [_serialize(p) for p in rows]


@router.get("/{phase_id}")
def get_phase(phase_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Phase not found")
    return _serialize(p)


@router.put("/{phase_id}")
def update_phase(
    phase_id: int,
    body: PhaseUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth_utils.require_admin),
):
    p = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Phase not found")

    # Snapshot current state to revisions
    snapshot = json.dumps(_serialize(p), ensure_ascii=False)
    rev = models.PhaseRevision(
        phase_id=p.id,
        snapshot=snapshot,
        author_id=admin.id,
        author_username=admin.username,
    )
    db.add(rev)

    # Apply edits
    data = body.model_dump(exclude_unset=True, by_alias=False)
    if "title" in data and data["title"] is not None:
        p.title = data["title"]
    if "subtitle" in data and data["subtitle"] is not None:
        p.subtitle = data["subtitle"]
    if "icon" in data and data["icon"] is not None:
        p.icon = data["icon"]
    if "color" in data and data["color"] is not None:
        p.color = data["color"]
    if "accent" in data and data["accent"] is not None:
        p.accent = data["accent"]
    if "difficulty" in data and data["difficulty"] is not None:
        p.difficulty = data["difficulty"]
    if "estimatedTime" in data and data["estimatedTime"] is not None:
        p.estimated_time = data["estimatedTime"]
    if "description" in data and data["description"] is not None:
        p.description = data["description"]
    if "objectives" in data and data["objectives"] is not None:
        clean = [str(x).strip() for x in data["objectives"] if str(x).strip()]
        p.objectives = json.dumps(clean, ensure_ascii=False)
    if "tips" in data and data["tips"] is not None:
        clean = [str(x).strip() for x in data["tips"] if str(x).strip()]
        p.tips = json.dumps(clean, ensure_ascii=False)
    if "tasks" in data and data["tasks"] is not None:
        # Preserve existing ids; auto-generate t<phase_id>-<n> for new items.
        existing_ids = set()
        try:
            for t in json.loads(p.tasks or "[]"):
                if isinstance(t, dict) and t.get("id"):
                    existing_ids.add(t["id"])
        except Exception:
            pass
        next_n = 1
        used_ids = set()
        out = []
        for item in data["tasks"]:
            label = str(item.get("label", "")).strip()
            if not label:
                continue
            tid = item.get("id") or ""
            if not tid or tid in used_ids:
                while True:
                    tid = f"t{p.id}-{next_n}"
                    next_n += 1
                    if tid not in used_ids and tid not in existing_ids:
                        break
            used_ids.add(tid)
            out.append({"id": tid, "label": label})
        p.tasks = json.dumps(out, ensure_ascii=False)

    db.flush()

    # Trim revisions to last MAX_REVISIONS
    db.execute(text("""
        DELETE FROM phase_revisions
        WHERE phase_id = :pid
        AND id NOT IN (
            SELECT id FROM phase_revisions
            WHERE phase_id = :pid
            ORDER BY id DESC
            LIMIT :keep
        )
    """), {"pid": p.id, "keep": MAX_REVISIONS})

    db.commit()
    db.refresh(p)
    return _serialize(p)


# --- Image uploads ---
import os, uuid as _uuid
from fastapi import UploadFile, File

UPLOAD_ROOT = "/var/www/cloud-training/uploads/phases"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_EXTS = {"png", "jpg", "jpeg", "webp", "gif"}


@router.post("/{phase_id}/upload")
async def upload_image(
    phase_id: int,
    file: UploadFile = File(...),
    admin: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    p = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Phase not found")

    name = (file.filename or "").lower().strip()
    if "." not in name:
        raise HTTPException(status_code=400, detail="File missing extension")
    ext = name.rsplit(".", 1)[1]
    if ext == "jpeg":
        ext = "jpg"
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Disallowed file type .{ext}")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    phase_dir = os.path.join(UPLOAD_ROOT, str(phase_id))
    os.makedirs(phase_dir, exist_ok=True)
    fname = f"{_uuid.uuid4().hex}.{ext}"
    fpath = os.path.join(phase_dir, fname)
    with open(fpath, "wb") as fh:
        fh.write(contents)

    return {"url": f"/uploads/phases/{phase_id}/{fname}", "filename": fname}


@router.delete("/{phase_id}/uploads/{filename}")
def delete_image(
    phase_id: int,
    filename: str,
    admin: models.User = Depends(auth_utils.require_admin),
):
    # Guard against path traversal — only basename allowed
    if "/" in filename or ".." in filename or filename.startswith("."):
        raise HTTPException(status_code=400, detail="Invalid filename")
    phase_dir = os.path.join(UPLOAD_ROOT, str(phase_id))
    fpath = os.path.join(phase_dir, filename)
    real = os.path.realpath(fpath)
    if not real.startswith(os.path.realpath(phase_dir) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not os.path.exists(real):
        return {"deleted": False}
    try:
        os.remove(real)
    except OSError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"deleted": True}


# --- Revisions ---

@router.get("/{phase_id}/revisions")
def list_revisions(
    phase_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth_utils.require_admin),
):
    p = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Phase not found")
    rows = (
        db.query(models.PhaseRevision)
        .filter(models.PhaseRevision.phase_id == phase_id)
        .order_by(models.PhaseRevision.id.desc())
        .all()
    )
    out = []
    for r in rows:
        try:
            snap = json.loads(r.snapshot)
            title = snap.get("title", "")
        except Exception:
            title = ""
        out.append({
            "id": r.id,
            "phase_id": r.phase_id,
            "author_username": r.author_username or "",
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "title": title,
        })
    return out


@router.get("/{phase_id}/revisions/{rev_id}")
def get_revision(
    phase_id: int,
    rev_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth_utils.require_admin),
):
    r = (
        db.query(models.PhaseRevision)
        .filter(models.PhaseRevision.id == rev_id, models.PhaseRevision.phase_id == phase_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Revision not found")
    try:
        snap = json.loads(r.snapshot)
    except Exception:
        snap = {}
    return {
        "id": r.id,
        "phase_id": r.phase_id,
        "author_username": r.author_username or "",
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "snapshot": snap,
    }


@router.post("/{phase_id}/revisions/{rev_id}/revert")
def revert_to_revision(
    phase_id: int,
    rev_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(auth_utils.require_admin),
):
    p = db.query(models.Phase).filter(models.Phase.id == phase_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Phase not found")
    r = (
        db.query(models.PhaseRevision)
        .filter(models.PhaseRevision.id == rev_id, models.PhaseRevision.phase_id == phase_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Revision not found")
    try:
        snap = json.loads(r.snapshot)
    except Exception:
        raise HTTPException(status_code=500, detail="Snapshot unreadable")

    pre = models.PhaseRevision(
        phase_id=p.id,
        snapshot=json.dumps(_serialize(p), ensure_ascii=False),
        author_id=admin.id,
        author_username=f"{admin.username} (pre-revert to #{rev_id})",
    )
    db.add(pre)

    p.title          = snap.get("title", "") or ""
    p.subtitle       = snap.get("subtitle", "") or ""
    p.icon           = snap.get("icon", "") or ""
    p.color          = snap.get("color", "") or ""
    p.accent         = snap.get("accent", "") or ""
    p.difficulty     = snap.get("difficulty", "") or ""
    p.estimated_time = snap.get("estimatedTime", "") or ""
    p.description    = snap.get("description", "") or ""
    p.objectives     = json.dumps(snap.get("objectives", []) or [], ensure_ascii=False)
    p.tasks          = json.dumps(snap.get("tasks", []) or [], ensure_ascii=False)
    p.tips           = json.dumps(snap.get("tips", []) or [], ensure_ascii=False)

    db.flush()

    db.execute(text(
        "DELETE FROM phase_revisions WHERE phase_id = :pid "
        "AND id NOT IN (SELECT id FROM phase_revisions "
        "WHERE phase_id = :pid ORDER BY id DESC LIMIT :keep)"
    ), {"pid": p.id, "keep": MAX_REVISIONS})

    db.commit()
    db.refresh(p)
    return _serialize(p)
