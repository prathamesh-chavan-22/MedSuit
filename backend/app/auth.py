from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from pathlib import Path
from dotenv import load_dotenv

from app.database import get_db
from app import models, schemas

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "changeme_secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
ALLOW_PUBLIC_REGISTER = os.getenv("ALLOW_PUBLIC_REGISTER", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_user_from_token(db: Session, token: str) -> Optional[models.User]:
    """Resolve token subject to an active user, returning None when invalid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if not username:
            return None
    except JWTError:
        return None

    user = get_user_by_username(db, username)
    if not user or not user.is_active:
        return None
    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user = get_user_from_token(db, token)
    if not user:
        raise credentials_exception
    return user


def require_role(*roles: models.UserRole):
    """Dependency factory: restrict endpoint to specific roles."""
    async def checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker
