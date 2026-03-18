import os
from pathlib import Path

from celery import Celery
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)

celery_app = Celery(
    "vitalis",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue="default",
    task_routes={
        "app.tasks.audio_tasks.*": {"queue": "audio"},
        "app.tasks.maintenance_tasks.*": {"queue": "maintenance"},
    },
    beat_schedule={
        "cleanup-expired-sessions": {
            "task": "app.tasks.maintenance_tasks.cleanup_expired_sessions_task",
            "schedule": 300.0,
        },
        "expire-consents": {
            "task": "app.tasks.maintenance_tasks.expire_consents_task",
            "schedule": 600.0,
        },
    },
)

celery_app.autodiscover_tasks(["app.tasks"])
