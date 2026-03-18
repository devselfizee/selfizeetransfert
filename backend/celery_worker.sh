#!/usr/bin/env bash
set -euo pipefail

echo "Starting Celery worker with beat scheduler..."

# Start Celery worker with embedded beat scheduler
exec celery -A app.tasks.celery_app worker \
    --beat \
    --loglevel=info \
    --concurrency=2 \
    --max-tasks-per-child=100 \
    --scheduler=celery.beat.PersistentScheduler \
    --schedule-filename=/tmp/celerybeat-schedule
