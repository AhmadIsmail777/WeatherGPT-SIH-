"""SQLAlchemy 2.x database setup and FastAPI session dependency."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class used by all ORM models and Alembic metadata discovery."""


engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and ensure it is closed afterwards."""

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
