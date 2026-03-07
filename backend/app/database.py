from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from pathlib import Path
from dotenv import load_dotenv

# Always load backend/.env regardless of current working directory.
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")


def _normalize_database_url(database_url: str) -> str:
    """Resolve relative SQLite URLs to a single DB file in project root."""
    if not database_url.startswith("sqlite:///"):
        return database_url

    sqlite_path = database_url.replace("sqlite:///", "", 1)
    if not sqlite_path:
        return f"sqlite:///{(PROJECT_ROOT / 'medsuite.db').as_posix()}"

    path_obj = Path(sqlite_path)
    if path_obj.is_absolute():
        return database_url

    # Route relative SQLite paths to the workspace root for consistency.
    return f"sqlite:///{(PROJECT_ROOT / sqlite_path).as_posix()}"

DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL", "sqlite:///./medsuite.db"))

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
