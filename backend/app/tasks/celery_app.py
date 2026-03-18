from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "selfizee_transfer",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.cleanup"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Beat schedule: run cleanup every 10 minutes
celery_app.conf.beat_schedule = {
    "cleanup-expired-transfers": {
        "task": "app.tasks.cleanup.cleanup_expired_transfers",
        "schedule": crontab(minute="*/10"),
    },
}
