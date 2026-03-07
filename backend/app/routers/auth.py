from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models, schemas
from app.audit import log_event
from app.auth import (
    authenticate_user, create_access_token, hash_password,
    get_current_user, get_user_by_email, get_user_by_username,
    require_role, ALLOW_PUBLIC_REGISTER
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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

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

    token = create_access_token({
        "sub": user.username,
        "role": user.role.value
    })

    log_event(
        db,
        action="auth.login_success",
        entity_type="user",
        entity_id=user.id,
        actor_user_id=user.id,
        details={"username": user.username},
        commit=True,
    )

    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user