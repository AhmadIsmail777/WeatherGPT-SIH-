"""Account registration, login, and identity endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_token_payload, verify_password
from app.db.crud import create_user, get_user_by_email, get_user_by_id
from app.db.database import get_db
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])
DatabaseSession = Annotated[Session, Depends(get_db)]


def _database_unavailable(exc: Exception) -> HTTPException:
    logger.error("Database operation failed: %s", exc.__class__.__name__)
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Database service is temporarily unavailable.",
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: DatabaseSession) -> UserResponse:
    """Register a user after checking the unique email constraint."""

    try:
        if get_user_by_email(db, str(payload.email)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
        return UserResponse.model_validate(create_user(db, payload))
    except HTTPException:
        raise
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.") from exc
    except SQLAlchemyError as exc:
        raise _database_unavailable(exc) from exc


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DatabaseSession) -> TokenResponse:
    """Issue a JWT after password verification."""

    try:
        user = get_user_by_email(db, str(payload.email))
    except SQLAlchemyError as exc:
        raise _database_unavailable(exc) from exc
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
async def read_current_user(
    token_payload: Annotated[dict[str, object], Depends(get_current_token_payload)],
    db: DatabaseSession,
) -> UserResponse:
    """Return the account identified by the validated bearer token."""

    try:
        user_id = int(str(token_payload["sub"]))
        user = get_user_by_id(db, user_id)
    except (KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.")
    except SQLAlchemyError as exc:
        raise _database_unavailable(exc) from exc
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserResponse.model_validate(user)
