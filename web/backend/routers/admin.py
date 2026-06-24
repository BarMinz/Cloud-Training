from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UserSummary(BaseModel):
    id: int
    username: str
    email: str
    role: str
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

    class Config:
        from_attributes = True


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
    try:
        user.role = models.UserRole(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    current_admin: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user and user.role == models.UserRole.admin:
        raise HTTPException(status_code=400, detail="Cannot delete an admin account. Demote to employee first.")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
