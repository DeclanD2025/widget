"""HTTP fetching with conditional GET, retries, per-domain throttling.

Retry policy (design §3): 3 attempts, exponential backoff 2s/4s/8s + jitter,
on transport errors and 5xx. 4xx is returned to the caller without retry.
"""
from __future__ import annotations

import asyncio
import gzip
import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import urlsplit

import httpx
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from manager_watch.settings import settings

log = structlog.get_logger(__name__)


class RetryableFetchError(Exception):
    pass


@dataclass
class FetchResult:
    url: str
    status: int
    content: bytes | None
    not_modified: bool
    etag: str | None = None
    last_modified: str | None = None
    fetched_at: datetime | None = None

    @property
    def sha256(self) -> str | None:
        return hashlib.sha256(self.content).hexdigest() if self.content is not None else None

    @property
    def content_gz(self) -> bytes | None:
        return gzip.compress(self.content) if self.content is not None else None

    @property
    def text(self) -> str:
        return (self.content or b"").decode("utf-8", errors="replace")


class DomainThrottle:
    """One concurrent request per domain, with a minimum delay between requests."""

    def __init__(self, min_delay: float = 0.0):
        self.min_delay = min_delay
        self._locks: dict[str, asyncio.Lock] = {}
        self._last_request: dict[str, float] = {}

    async def __call__(self, url: str):
        domain = urlsplit(url).netloc
        lock = self._locks.setdefault(domain, asyncio.Lock())
        await lock.acquire()
        loop = asyncio.get_event_loop()
        elapsed = loop.time() - self._last_request.get(domain, -1e9)
        if elapsed < self.min_delay:
            await asyncio.sleep(self.min_delay - elapsed)
        self._last_request[domain] = loop.time()
        return lock


monitor_throttle = DomainThrottle(min_delay=0.5)
research_throttle = DomainThrottle(min_delay=settings.research_domain_delay_seconds)


def build_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        headers={"User-Agent": settings.user_agent},
        timeout=settings.fetch_timeout_seconds,
        follow_redirects=True,
    )


@retry(
    retry=retry_if_exception_type(RetryableFetchError),
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=2, max=10),
    reraise=True,
)
async def _request(client: httpx.AsyncClient, url: str, headers: dict) -> httpx.Response:
    try:
        response = await client.get(url, headers=headers)
    except httpx.TransportError as exc:
        raise RetryableFetchError(str(exc)) from exc
    if response.status_code >= 500:
        raise RetryableFetchError(f"HTTP {response.status_code} for {url}")
    return response


async def fetch(
    client: httpx.AsyncClient,
    url: str,
    *,
    etag: str | None = None,
    last_modified: str | None = None,
    throttle: DomainThrottle = monitor_throttle,
) -> FetchResult:
    headers: dict[str, str] = {}
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified

    lock = await throttle(url)
    try:
        response = await _request(client, url, headers)
    finally:
        lock.release()

    fetched_at = datetime.now(timezone.utc)
    if response.status_code == 304:
        return FetchResult(url=url, status=304, content=None, not_modified=True,
                           etag=etag, last_modified=last_modified, fetched_at=fetched_at)
    return FetchResult(
        url=url,
        status=response.status_code,
        content=response.content if response.status_code < 400 else None,
        not_modified=False,
        etag=response.headers.get("ETag"),
        last_modified=response.headers.get("Last-Modified"),
        fetched_at=fetched_at,
    )
