"""
Cognitive Agent Platform — PostgreSQL Connection
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from config import get_settings

settings = get_settings()

DATABASE_URL = settings.database_url or "sqlite:///./cap_local.db"

# We use SQLite fallback just in case postgres isn't up
engine = create_engine(
    DATABASE_URL, 
    # check_same_thread ONLY applies to sqlite
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
