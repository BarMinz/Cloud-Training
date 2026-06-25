from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/admin/analytics", tags=["analytics"])


@router.get("/summary")
def get_summary(
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).all()
    total = len(users)

    certified = sum(
        1 for u in users
        if sum(1 for p in u.progress if p.status == models.PhaseStatus.completed) == 10
    )

    total_completed = sum(
        sum(1 for p in u.progress if p.status == models.PhaseStatus.completed)
        for u in users
    )
    avg_phases = round(total_completed / total, 1) if total else 0

    cutoff = datetime.utcnow() - timedelta(days=7)
    active = sum(
        1 for u in users
        if any(p.updated_at and p.updated_at > cutoff for p in u.progress)
    )

    return {
        "total_users": total,
        "fully_certified": certified,
        "certification_rate": round(certified / total * 100, 1) if total else 0,
        "avg_phases_completed": avg_phases,
        "active_users_7d": active,
    }


@router.get("/funnel")
def get_funnel(
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).all()
    total = len(users)

    result = []
    for phase_id in range(1, 11):
        records = [p for u in users for p in u.progress if p.phase_id == phase_id]
        completed = [p for p in records if p.status == models.PhaseStatus.completed]
        in_prog = [p for p in records if p.status == models.PhaseStatus.in_progress]

        durations = [
            (p.completed_at - p.started_at).days
            for p in completed
            if p.completed_at and p.started_at and p.completed_at > p.started_at
        ]

        result.append({
            "phase_id": phase_id,
            "completed": len(completed),
            "in_progress": len(in_prog),
            "not_started": total - len(completed) - len(in_prog),
            "completion_rate": round(len(completed) / total * 100, 1) if total else 0,
            "avg_days": round(sum(durations) / len(durations), 1) if durations else None,
        })

    return result


@router.get("/users")
def get_users_progress(
    _: models.User = Depends(auth_utils.require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).all()
    result = []

    for u in users:
        completed = sum(1 for p in u.progress if p.status == models.PhaseStatus.completed)
        in_prog = sum(1 for p in u.progress if p.status == models.PhaseStatus.in_progress)
        last_active = max(
            (p.updated_at for p in u.progress if p.updated_at),
            default=None,
        )
        result.append({
            "user_id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "completed_phases": completed,
            "in_progress_phases": in_prog,
            "progress_score": completed * 10 + in_prog * 5,
            "last_active": last_active.isoformat() if last_active else None,
        })

    return sorted(result, key=lambda x: x["progress_score"], reverse=True)
