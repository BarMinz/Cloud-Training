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
        result = conn.execute(text("PRAGMA table_info(chat_messages)"))
        cmcols = {row[1] for row in result.fetchall()}
        if cmcols and "recipient_id" not in cmcols:
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN recipient_id INTEGER"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_messages_recipient_id ON chat_messages(recipient_id)"))
            conn.commit()

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                token TEXT NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT (datetime('now'))
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_token ON password_reset_tokens(token)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens(user_id)"))
        conn.commit()

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS chat_read_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                convo_key TEXT NOT NULL,
                last_message_id INTEGER NOT NULL DEFAULT 0,
                UNIQUE(user_id, convo_key)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_read_positions_user_id ON chat_read_positions(user_id)"))
        conn.commit()



class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
