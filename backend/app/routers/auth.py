from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas
from app.audit import log_event
from app.auth import (
    authenticate_user, create_access_token, hash_password,
    get_current_user, get_user_by_email, get_user_by_username,
    require_role, ALLOW_PUBLIC_REGISTER,
    ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_MINUTES,
    create_refresh_token, create_user_session, get_active_session_by_refresh_token,
    rotate_session_refresh_token, revoke_session, cleanup_expired_sessions,
)
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if not ALLOW_PUBLIC_REGISTER:
        raise HTTPException(
            status_code=403,
            detail="Public registration is disabled. Use /auth/register/admin.",
        )

    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user = models.User(
        username=user_in.username,
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/register/admin", response_model=schemas.UserOut, status_code=201)
def register_admin(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role(models.UserRole.admin)),
):
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user = models.User(
        username=user_in.username,
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(
        db,
        action="user.created.admin",
        entity_type="user",
        entity_id=user.id,
        actor_user_id=_.id,
        details={"username": user.username, "role": user.role.value},
        commit=True,
    )

    return user


@router.post("/login", response_model=schemas.Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        candidate = get_user_by_username(db, form_data.username)
        log_event(
            db,
            action="auth.login_failed",
            entity_type="user",
            entity_id=candidate.id if candidate else None,
            actor_user_id=candidate.id if candidate else None,
            details={"username": form_data.username},
            commit=True,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    refresh_token = create_refresh_token()
    session = create_user_session(
        db,
        user_id=user.id,
        refresh_token=refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )

    token = create_access_token(
        {
            "sub": user.username,
            "role": user.role.value,
            "sid": session.id,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    log_event(
        db,
        action="auth.login_success",
        entity_type="user",
        entity_id=user.id,
        actor_user_id=user.id,
        details={"username": user.username},
        commit=True,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "session_id": session.id,
        "access_expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_in": REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(
    body: schemas.RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    cleanup_expired_sessions(db)
    session = get_active_session_by_refresh_token(db, body.refresh_token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Session user is inactive")

    new_refresh_token = create_refresh_token()
    rotate_session_refresh_token(db, session, new_refresh_token)

    token = create_access_token(
        {
            "sub": user.username,
            "role": user.role.value,
            "sid": session.id,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    log_event(
        db,
        action="auth.refresh_success",
        entity_type="session",
        entity_id=session.id,
        actor_user_id=user.id,
        details={"username": user.username},
        commit=True,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
        "session_id": session.id,
        "access_expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_in": REFRESH_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/logout", status_code=204)
def logout(
    body: schemas.LogoutRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = (
        db.query(models.UserSession)
        .filter(models.UserSession.id == body.session_id)
        .filter(models.UserSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    revoke_session(db, session)
    log_event(
        db,
        action="auth.logout",
        entity_type="session",
        entity_id=session.id,
        actor_user_id=current_user.id,
        commit=True,
    )


@router.get("/sessions", response_model=list[schemas.SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cleanup_expired_sessions(db)
    return (
        db.query(models.UserSession)
        .filter(models.UserSession.user_id == current_user.id)
        .order_by(models.UserSession.created_at.desc())
        .all()
    )


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user