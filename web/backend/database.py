from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./training.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def run_migrations(engine):
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(users)"))
        user_cols = {row[1] for row in result.fetchall()}
        if "avatar" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar TEXT"))
            conn.commit()

        result = conn.execute(text("PRAGMA table_info(phase_progress)"))
        cols = {row[1] for row in result.fetchall()}
        if "updated_at" not in cols:
            conn.execute(text("ALTER TABLE phase_progress ADD COLUMN updated_at DATETIME"))
            conn.commit()
        if "sim_data" not in cols:
            conn.execute(text("ALTER TABLE phase_progress ADD COLUMN sim_data TEXT"))
            conn.commit()
        if "grade" not in cols:
            conn.execute(text("ALTER TABLE phase_progress ADD COLUMN grade TEXT"))
            conn.commit()
        if "feedback" not in cols:
            conn.execute(text("ALTER TABLE phase_progress ADD COLUMN feedback TEXT"))
            conn.commit()
        if "reviewed_by" not in cols:
            conn.execute(text("ALTER TABLE phase_progress ADD COLUMN reviewed_by INTEGER"))
            conn.commit()
        if "reviewed_at" not in cols:
            conn.execute(text("ALTER TABLE phase_progress ADD COLUMN reviewed_at DATETIME"))
            conn.commit()


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
