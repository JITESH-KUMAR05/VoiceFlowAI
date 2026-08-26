"""Bounded in-memory stores for conversation and audio state.

Conversation history, call metadata and pending audio requests were plain
module-level dicts. Nothing removed an entry unless a call ended cleanly, so an
abandoned browser session or a dropped webhook leaked its transcript for the
lifetime of the process.

Every store is now bounded twice over: entries expire after a TTL, and the
oldest is evicted once the cache is full. Losing the oldest session under
pressure is the right tradeoff here, because a session older than the TTL
belongs to a call that has already ended.

This is deliberately still in-process. Persisting sessions to Redis would be
the correct move behind more than one worker, and that limitation is documented
rather than hidden.
"""

from __future__ import annotations

import threading
from collections import OrderedDict
from time import monotonic
from typing import Any, Callable, Iterator


class TTLCache:
    """A size-bounded mapping whose entries expire.

    Safe to use from several threads: FastAPI runs sync route handlers and
    background tasks in a worker pool, so more than one can touch a store at
    the same time.
    """

    def __init__(
        self,
        ttl_seconds: float,
        max_entries: int,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        if max_entries <= 0:
            raise ValueError("max_entries must be positive")

        self._ttl = ttl_seconds
        self._max_entries = max_entries
        self._clock = clock
        self._entries: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def _is_expired(self, stored_at: float) -> bool:
        return self._clock() - stored_at > self._ttl

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            # Re-inserting moves the key to the newest position, so an active
            # session is not evicted while a stale one survives.
            self._entries.pop(key, None)
            self._entries[key] = (self._clock(), value)
            while len(self._entries) > self._max_entries:
                self._entries.popitem(last=False)

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return default
            stored_at, value = entry
            if self._is_expired(stored_at):
                del self._entries[key]
                return default
            return value

    def pop(self, key: str, default: Any = None) -> Any:
        with self._lock:
            entry = self._entries.pop(key, None)
            if entry is None:
                return default
            stored_at, value = entry
            return default if self._is_expired(stored_at) else value

    def prune(self) -> int:
        """Drop every expired entry. Returns how many were removed."""
        with self._lock:
            expired = [
                key
                for key, (stored_at, _) in self._entries.items()
                if self._is_expired(stored_at)
            ]
            for key in expired:
                del self._entries[key]
            return len(expired)

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)

    def __iter__(self) -> Iterator[str]:
        with self._lock:
            return iter(list(self._entries))


class SessionStore:
    """The three pieces of per-call state, bounded together.

    ``conversations`` holds the message history sent to the model,
    ``metadata`` the persona and lead details for the call, and ``audio`` the
    pending synthesis requests that a stream URL resolves against.

    Audio requests expire far sooner than sessions: a stream URL is fetched
    within seconds of being handed out, so holding them for a full session TTL
    would only accumulate dead entries.
    """

    def __init__(
        self,
        session_ttl: float,
        session_max: int,
        audio_ttl: float,
        audio_max: int,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self.conversations = TTLCache(session_ttl, session_max, clock)
        self.metadata = TTLCache(session_ttl, session_max, clock)
        self.audio = TTLCache(audio_ttl, audio_max, clock)

    def prune(self) -> int:
        return (
            self.conversations.prune() + self.metadata.prune() + self.audio.prune()
        )

    @property
    def active_sessions(self) -> int:
        return len(self.conversations)
