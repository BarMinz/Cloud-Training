from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/progress", tags=["progress"])

TOTAL_PHASES = 10


class ProgressUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class ProgressResponse(BaseModel):
    phase_id: int
    status: str
    notes: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


def _get_or_create(db: Session, user_id: int, phase_id: int) -> models.PhaseProgress:
    record = (
        db.query(models.PhaseProgress)
        .filter_by(user_id=user_id, phase_id=phase_id)
        .first()
    )
    if not record:
        record = models.PhaseProgress(user_id=user_id, phase_id=phase_id)
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


@router.get("/", response_model=list[ProgressResponse])
def get_my_progress(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    records = []
    for phase_id in range(1, TOTAL_PHASES + 1):
        records.append(_get_or_create(db, current_user.id, phase_id))
    return records


@router.put("/{phase_id}", response_model=ProgressResponse)
def update_progress(
    phase_id: int,
    body: ProgressUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    if not 1 <= phase_id <= TOTAL_PHASES:
        raise HTTPException(status_code=404, detail="Phase not found")

    try:
        new_status = models.PhaseStatus(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")

    record = _get_or_create(db, current_user.id, phase_id)
    old_status = record.status

    record.status = new_status
    if body.notes is not None:
        record.notes = body.notes

    now = datetime.now(timezone.utc)
    if new_status == models.PhaseStatus.in_progress and old_status == models.PhaseStatus.not_started:
        record.started_at = now
    if new_status == models.PhaseStatus.completed and not record.started_at:
        record.started_at = now
    if new_status == models.PhaseStatus.completed:
        record.completed_at = now
    elif new_status != models.PhaseStatus.completed:
        record.completed_at = None

    db.commit()
    db.refresh(record)
    return record
