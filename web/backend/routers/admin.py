from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from email_utils import send_grade_notification
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os, time
from database import get_db
import models
import auth as auth_utils
from routers.containers import container_name, _run

AVATAR_DIR = "/var/www/cloud-training/avatars"
ALLOWED_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024

TOTAL_PHASES = 10

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UserSummary(BaseModel):
    id: int
    username: str
    email: str
    role: str
    avatar: Optional[str] = None
    created_at: Optional[datetime]
    completed_phases: int
    in_progress_phases: int

    class Config:
        from_attributes = True


class ProgressEntry(BaseModel):
    phase_id: int
    status: str
    notes: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    grade: Optional[str] = None
    feedback: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReviewSubmit(BaseModel):
    grade: str          # "passed" | "not_passed"
    feedback: Optional[str] = None


class UserDetail(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: Optional[datetime]
    progress: list[ProgressEntry]

    class Config:
        from_attributes = True


class RoleUpdate(BaseModel):
    role: str


class UserEdit(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    new_password: Optional[str] = None


@router.get("/users", response_model=list[UserSummary])
def list_users(
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).all()
    result = []
    for user in users:
        completed = sum(1 for p in user.progress if p.status == models.PhaseStatus.completed)
        in_progress = sum(1 for p in user.progress if p.status == models.PhaseStatus.in_progress)
        result.append(UserSummary(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            avatar=user.avatar,
            created_at=user.created_at,
            completed_phases=completed,
            in_progress_phases=in_progress,
        ))
    return result


@router.get("/users/{user_id}", response_model=UserDetail)
def get_user(
    user_id: int,
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    progress = []
    for phase_id in range(1, 11):
        record = next((p for p in user.progress if p.phase_id == phase_id), None)
        if record:
            progress.append(ProgressEntry(
                phase_id=phase_id,
                status=record.status,
                notes=record.notes or "",
                started_at=record.started_at,
                completed_at=record.completed_at,
                grade=record.grade,
                feedback=record.feedback,
                reviewed_by=record.reviewed_by,
                reviewed_at=record.reviewed_at,
            ))
        else:
            progress.append(ProgressEntry(phase_id=phase_id, status="not_started", notes="", started_at=None, completed_at=None))

    return UserDetail(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        progress=progress,
    )


@router.patch("/users/{user_id}/role")
def update_role(
    user_id: int,
    body: RoleUpdate,
    current_admin: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == models.UserRole.main_admin:
        raise HTTPException(status_code=400, detail="Cannot change the role of the main admin")
    if body.role == models.UserRole.main_admin:
        raise HTTPException(status_code=400, detail="Cannot assign the main admin role")
    try:
        user.role = models.UserRole(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    db.commit()
    return {"ok": True}


@router.patch("/users/{user_id}")
def edit_user(
    user_id: int,
    body: UserEdit,
    current_admin: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.username is not None and body.username != user.username:
        if db.query(models.User).filter(models.User.username == body.username, models.User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = body.username

    if body.email is not None and body.email != user.email:
        if db.query(models.User).filter(models.User.email == body.email, models.User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = body.email

    if body.role is not None and body.role != user.role:
        if current_admin.id == user_id:
            raise HTTPException(status_code=400, detail="Cannot change your own role")
        if user.role == models.UserRole.main_admin:
            raise HTTPException(status_code=400, detail="Cannot change the role of the main admin")
        if body.role == models.UserRole.main_admin:
            raise HTTPException(status_code=400, detail="Cannot assign the main admin role")
        try:
            user.role = models.UserRole(body.role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")

    if body.new_password is not None and body.new_password != "":
        if len(body.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        user.password_hash = auth_utils.hash_password(body.new_password)

    db.commit()
    return {"ok": True, "username": user.username, "email": user.email, "role": user.role, "avatar": user.avatar}


@router.post("/users/{user_id}/avatar", status_code=200)
async def admin_upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF, or WebP images are allowed")

    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="File too large — maximum 2 MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{user_id}_{int(time.time())}.{ext}"

    os.makedirs(AVATAR_DIR, exist_ok=True)
    if user.avatar:
        old_path = os.path.join(AVATAR_DIR, os.path.basename(user.avatar))
        if os.path.exists(old_path):
            os.remove(old_path)

    with open(os.path.join(AVATAR_DIR, filename), "wb") as f:
        f.write(contents)

    user.avatar = f"/avatars/{filename}"
    db.commit()
    return {"avatar": user.avatar}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    current_admin: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and user.role == models.UserRole.main_admin:
        raise HTTPException(status_code=400, detail="Cannot delete the main admin account.")
    if user and user.role == models.UserRole.admin:
        raise HTTPException(status_code=400, detail="Cannot delete an admin account. Demote to employee first.")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


@router.get("/users/{user_id}/progress/{phase_id}/simulation")
def get_simulation_data(
    user_id: int,
    phase_id: int,
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    record = db.query(models.PhaseProgress).filter_by(user_id=user_id, phase_id=phase_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="No progress record found")
    return {"sim_data": record.sim_data}


@router.post("/users/{user_id}/progress/{phase_id}/reset", status_code=200)
def reset_phase(
    user_id: int,
    phase_id: int,
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    if not 1 <= phase_id <= TOTAL_PHASES:
        raise HTTPException(status_code=404, detail="Phase not found")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    record = db.query(models.PhaseProgress).filter_by(user_id=user_id, phase_id=phase_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Progress record not found")
    record.status = models.PhaseStatus.not_started
    record.started_at = None
    record.completed_at = None
    record.updated_at = datetime.utcnow()
    record.sim_data = None
    record.grade = None
    record.feedback = None
    record.reviewed_by = None
    record.reviewed_at = None
    db.commit()

    if phase_id == 2:
        _run(['docker', 'rm', '-f', container_name(user_id)])

    return {"ok": True}


@router.post("/users/{user_id}/progress/{phase_id}/review", status_code=200)
def submit_review(
    user_id: int,
    phase_id: int,
    body: ReviewSubmit,
    current_admin: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    if body.grade not in ("passed", "not_passed"):
        raise HTTPException(status_code=400, detail="Grade must be 'passed' or 'not_passed'")
    if not 1 <= phase_id <= TOTAL_PHASES:
        raise HTTPException(status_code=404, detail="Phase not found")
    record = db.query(models.PhaseProgress).filter_by(user_id=user_id, phase_id=phase_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Progress record not found")
    record.grade = body.grade
    record.feedback = body.feedback or ""
    record.reviewed_by = current_admin.id
    record.reviewed_at = datetime.utcnow()

    if body.grade == "not_passed":
        record.status = models.PhaseStatus.in_progress
        record.completed_at = None

    db.commit()

    trainee = db.query(models.User).filter(models.User.id == user_id).first()
    if trainee:
        _PHASE_TITLES = {
            1: "Ticket Simulation", 2: "LAMP Project", 3: "Troubleshooting Lab",
            4: "Firewall Lab", 5: "Windows Infrastructure", 6: "Site-to-Site VPN",
            7: "AI Ticket Handling", 8: "cPanel Migration + DNS",
            9: "AI Debugging", 10: "KVM Operations Lab",
        }
        phase_title = _PHASE_TITLES.get(phase_id, f"Phase {phase_id}")
        send_grade_notification(
            to=trainee.email,
            username=trainee.username,
            phase_title=phase_title,
            grade=body.grade,
            feedback=record.feedback,
        )

    return {
        "grade": record.grade,
        "feedback": record.feedback,
        "reviewed_by": record.reviewed_by,
        "reviewed_at": record.reviewed_at,
        "status": record.status,
    }
