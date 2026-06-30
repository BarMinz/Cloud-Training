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

        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS phases (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                subtitle TEXT NOT NULL DEFAULT '',
                icon TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT '',
                accent TEXT NOT NULL DEFAULT '',
                difficulty TEXT NOT NULL DEFAULT '',
                estimated_time TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                objectives TEXT NOT NULL DEFAULT '[]',
                tasks TEXT NOT NULL DEFAULT '[]',
                tips TEXT NOT NULL DEFAULT '[]',
                updated_at DATETIME DEFAULT (datetime('now'))
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS phase_revisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phase_id INTEGER NOT NULL REFERENCES phases(id),
                snapshot TEXT NOT NULL,
                author_id INTEGER REFERENCES users(id),
                author_username TEXT,
                created_at DATETIME DEFAULT (datetime('now'))
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_phase_revisions_phase_id ON phase_revisions(phase_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_phase_revisions_created_at ON phase_revisions(created_at)"))
        conn.commit()

        # Seed phases from JSON if table empty
        row = conn.execute(text("SELECT COUNT(*) FROM phases")).fetchone()
        if row and row[0] == 0:
            import json, os
            seed_path = os.path.join(os.path.dirname(__file__), 'seed_data', 'phases.json')
            if os.path.exists(seed_path):
                with open(seed_path, 'r', encoding='utf-8') as f:
                    phases = json.load(f)
                for ph in phases:
                    conn.execute(text("""
                        INSERT INTO phases (id, title, subtitle, icon, color, accent, difficulty,
                                            estimated_time, description, objectives, tasks, tips)
                        VALUES (:id, :title, :subtitle, :icon, :color, :accent, :difficulty,
                                :estimated_time, :description, :objectives, :tasks, :tips)
                    """), {
                        'id': ph['id'],
                        'title': ph.get('title', ''),
                        'subtitle': ph.get('subtitle', ''),
                        'icon': ph.get('icon', ''),
                        'color': ph.get('color', ''),
                        'accent': ph.get('accent', ''),
                        'difficulty': ph.get('difficulty', ''),
                        'estimated_time': ph.get('estimatedTime', ''),
                        'description': ph.get('description', ''),
                        'objectives': json.dumps(ph.get('objectives', []), ensure_ascii=False),
                        'tasks': json.dumps(ph.get('tasks', []), ensure_ascii=False),
                        'tips': json.dumps(ph.get('tips', []), ensure_ascii=False),
                    })
                conn.commit()



class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
