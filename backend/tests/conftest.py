import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Force app to use a dedicated test DB before importing app modules.
TEST_DB_PATH = Path(__file__).resolve().parent / "test_medsuite.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ALLOW_PUBLIC_REGISTER"] = "false"

from app import models
from app.auth import hash_password
from app.database import get_db
from main import app


test_engine = create_engine(
    os.environ["DATABASE_URL"],
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    models.Base.metadata.drop_all(bind=test_engine)
    models.Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_user(db_session, username: str, password: str, role: models.UserRole, email: str):
    user = models.User(
        username=username,
        full_name=username,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def user_factory(db_session):
    def _factory(username: str, password: str, role: models.UserRole, email: str):
        return create_user(db_session, username, password, role, email)

    return _factory


def login_token(client: TestClient, username: str, password: str) -> str:
    response = client.post(
        "/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture()
def token_factory(client):
    def _factory(username: str, password: str) -> str:
        return login_token(client, username, password)

    return _factory
