"""Bounded in-memory session storage.

Conversation history, call metadata and pending audio requests all lived in
plain module-level dicts that were never pruned. A long-running process leaked
every call it had ever handled.
"""

from app.session import TTLCache


class FakeClock:
    """A hand-advanced clock, so expiry tests do not sleep."""

    def __init__(self):
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def test_a_stored_value_is_readable_before_it_expires():
    cache = TTLCache(ttl_seconds=60, max_entries=10, clock=FakeClock())

    cache.set("call-1", {"greeting": "hello"})

    assert cache.get("call-1") == {"greeting": "hello"}


def test_a_value_is_gone_once_its_ttl_has_passed():
    clock = FakeClock()
    cache = TTLCache(ttl_seconds=60, max_entries=10, clock=clock)
    cache.set("call-1", "payload")

    clock.advance(61)

    assert cache.get("call-1") is None


def test_an_expired_entry_does_not_keep_occupying_the_cache():
    clock = FakeClock()
    cache = TTLCache(ttl_seconds=60, max_entries=10, clock=clock)
    cache.set("call-1", "payload")

    clock.advance(61)
    cache.prune()

    assert len(cache) == 0


def test_the_oldest_entry_is_evicted_once_the_cache_is_full():
    cache = TTLCache(ttl_seconds=600, max_entries=2, clock=FakeClock())

    cache.set("first", 1)
    cache.set("second", 2)
    cache.set("third", 3)

    assert len(cache) == 2
    assert cache.get("first") is None
    assert cache.get("third") == 3


def test_rewriting_a_key_does_not_grow_the_cache():
    cache = TTLCache(ttl_seconds=600, max_entries=2, clock=FakeClock())

    cache.set("call-1", "before")
    cache.set("call-1", "after")

    assert len(cache) == 1
    assert cache.get("call-1") == "after"


def test_pop_returns_the_value_and_removes_it():
    cache = TTLCache(ttl_seconds=600, max_entries=10, clock=FakeClock())
    cache.set("call-1", "payload")

    assert cache.pop("call-1") == "payload"
    assert cache.get("call-1") is None


def test_pop_on_a_missing_key_returns_the_default():
    cache = TTLCache(ttl_seconds=600, max_entries=10, clock=FakeClock())

    assert cache.pop("never-existed", "fallback") == "fallback"
