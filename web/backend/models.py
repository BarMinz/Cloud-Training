from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class UserRole(str, enum.Enum):
    employee = "employee"
    admin = "admin"
    main_admin = "main_admin"


class PhaseStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.employee, nullable=False)
    avatar = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    progress = relationship("PhaseProgress", foreign_keys="[PhaseProgress.user_id]", back_populates="user", cascade="all, delete-orphan")


class PhaseProgress(Base):
    __tablename__ = "phase_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    phase_id = Column(Integer, nullable=False)
    status = Column(Enum(PhaseStatus), default=PhaseStatus.not_started, nullable=False)
    notes = Column(String, default="")
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime, nullable=True)
    sim_data = Column(String, nullable=True)
    grade = Column(String, nullable=True)          # "passed" | "not_passed" | None
    feedback = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="progress")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    username = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class ChatReadPosition(Base):
    __tablename__ = "chat_read_positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    convo_key = Column(String, nullable=False)       # "public" or str(other_user_id)
    last_message_id = Column(Integer, nullable=False, default=0)

class Phase(Base):
    __tablename__ = "phases"

    id = Column(Integer, primary_key=True, index=True)  # 1..10
    title = Column(String, nullable=False, default="")
    subtitle = Column(String, nullable=False, default="")
    icon = Column(String, nullable=False, default="")
    color = Column(String, nullable=False, default="")
    accent = Column(String, nullable=False, default="")
    difficulty = Column(String, nullable=False, default="")
    estimated_time = Column(String, nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    objectives = Column(Text, nullable=False, default="[]")   # JSON array of strings
    tasks = Column(Text, nullable=False, default="[]")        # JSON array of {id,label}
    tips = Column(Text, nullable=False, default="[]")         # JSON array of strings
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PhaseRevision(Base):
    __tablename__ = "phase_revisions"

    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("phases.id"), nullable=False, index=True)
    snapshot = Column(Text, nullable=False)                   # full JSON of phase at save time
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_username = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

