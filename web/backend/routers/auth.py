from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os, time
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_DIR = "/var/www/cloud-training/avatars"
ALLOWED_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class EmailChange(BaseModel):
    email: str
    current_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    is_first = db.query(models.User).count() == 0
    user = models.User(
        username=req.username,
        email=req.email,
        password_hash=auth_utils.hash_password(req.password),
        role=models.UserRole.admin if is_first else models.UserRole.employee,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form.username).first()
    if not user or not auth_utils.verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = auth_utils.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user


@router.patch("/me/password", status_code=200)
def change_password(
    body: PasswordChange,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth_utils.verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    current_user.password_hash = auth_utils.hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@router.patch("/me/email", status_code=200)
def change_email(
    body: EmailChange,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    if not auth_utils.verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if db.query(models.User).filter(models.User.email == body.email, models.User.id != current_user.id).first():
        raise HTTPException(status_code=400, detail="Email already in use")
    current_user.email = body.email
    db.commit()
    return {"ok": True}


@router.post("/me/avatar", status_code=200)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF, or WebP images are allowed")

    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="File too large — maximum 2 MB")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{current_user.id}_{int(time.time())}.{ext}"

    os.makedirs(AVATAR_DIR, exist_ok=True)

    # Remove old avatar file if it exists
    if current_user.avatar:
        old_path = os.path.join(AVATAR_DIR, os.path.basename(current_user.avatar))
        if os.path.exists(old_path):
            os.remove(old_path)

    with open(os.path.join(AVATAR_DIR, filename), "wb") as f:
        f.write(contents)

    current_user.avatar = f"/avatars/{filename}"
    db.commit()
    return {"avatar": current_user.avatar}
