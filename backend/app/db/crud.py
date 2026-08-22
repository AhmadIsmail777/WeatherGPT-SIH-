"""Focused database operations used by user-facing services/routes."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    """Find an account by its unique email address."""

    return db.scalar(select(User).where(User.email == email.lower()))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Find an account by primary key."""

    return db.get(User, user_id)


def create_user(db: Session, payload: UserCreate) -> User:
    """Persist a new account with a hashed password."""

    user = User(
        name=payload.name,
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        preferred_language=payload.preferred_language,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
