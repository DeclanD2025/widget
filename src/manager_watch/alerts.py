"""Webhook alerts (Slack/Discord-compatible JSON POST). No-op without
MW_ALERT_WEBHOOK_URL."""
from __future__ import annotations

import httpx
import structlog

from manager_watch.settings import settings

log = structlog.get_logger(__name__)


def send_alert(title: str, detail: str = "", level: str = "info") -> None:
    log.info("alert", title=title, detail=detail, level=level)
    if not settings.alert_webhook_url:
        return
    try:
        httpx.post(
            settings.alert_webhook_url,
            json={"text": f"[{level.upper()}] {title}\n{detail}".strip()},
            timeout=10,
        )
    except httpx.HTTPError as exc:
        log.error("alert.delivery_failed", error=str(exc))
