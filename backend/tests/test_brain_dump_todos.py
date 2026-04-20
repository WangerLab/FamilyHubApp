"""Backend tests for POST /api/brain-dump/parse with mode='todos' (Session 5)."""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
PARSE_URL = f"{BASE_URL}/api/brain-dump/parse"

ALLOWED_PRIORITIES = {"high", "medium", "low"}


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Schema test ---

def test_todos_mode_returns_correct_schema(session):
    payload = {
        "user_id": f"t-{uuid.uuid4().hex[:8]}",
        "text": "Iris soll morgen Auto waschen, Müll heute raus ist wichtig, Arzttermin in drei Tagen, Rasen mähen irgendwann",
        "mode": "todos",
    }
    r = session.post(PARSE_URL, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("mode") == "todos"
    items = data["items"]
    assert isinstance(items, list)
    assert len(items) >= 3, f"Expected >=3 items, got {len(items)}: {items}"

    for it in items:
        assert "title" in it and isinstance(it["title"], str) and it["title"]
        assert "priority" in it and it["priority"] in ALLOWED_PRIORITIES, f"Bad priority: {it.get('priority')}"
        # due_date can be None or ISO string
        assert "due_date" in it
        if it["due_date"] is not None:
            assert isinstance(it["due_date"], str)
        assert "assignee_hint" in it and isinstance(it["assignee_hint"], str)
        assert "comment" in it and isinstance(it["comment"], str)
        # Should NOT contain grocery/misc fields
        assert "category" not in it
        assert "location_tag" not in it
        assert "quantity" not in it

    # Heuristic checks: assignee_hint should pick up "Iris"
    iris_items = [it for it in items if "iris" in it["assignee_hint"].lower()]
    assert len(iris_items) >= 1, f"Expected at least one item assigned to Iris: {items}"

    # "Müll" should be high prio (wichtig)
    muell = next((it for it in items if "müll" in it["title"].lower() or "muell" in it["title"].lower()), None)
    if muell:
        assert muell["priority"] == "high", f"Müll should be high prio: {muell}"

    # "Rasen mähen irgendwann" → low prio
    rasen = next((it for it in items if "rasen" in it["title"].lower()), None)
    if rasen:
        assert rasen["priority"] == "low", f"Rasen should be low prio: {rasen}"


# --- Stale date null-out ---

def test_stale_due_date_is_nulled_out(session):
    """Claude often returns 2024-ish dates. Server must null them when >30 days old."""
    payload = {
        "user_id": f"stale-{uuid.uuid4().hex[:8]}",
        "text": "Müll heute rausbringen, Auto morgen waschen, Arzttermin nächste Woche",
        "mode": "todos",
    }
    r = session.post(PARSE_URL, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    for it in data["items"]:
        if it["due_date"] is not None:
            try:
                parsed = datetime.fromisoformat(it["due_date"].replace("Z", "+00:00"))
            except ValueError:
                pytest.fail(f"due_date not ISO parseable: {it['due_date']}")
            assert parsed >= cutoff, f"Stale date returned (should be nulled): {it}"


# --- Backwards compat ---

def test_no_mode_still_grocery(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"bc-{uuid.uuid4().hex[:8]}", "text": "1 Apfel"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["mode"] == "grocery"
    assert "category" in data["items"][0]


# --- Validation ---

def test_todos_mode_empty_text_400(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"v-{uuid.uuid4().hex[:8]}", "text": "", "mode": "todos"},
        timeout=20,
    )
    assert r.status_code == 400


def test_todos_mode_too_long_400(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"v-{uuid.uuid4().hex[:8]}", "text": "x" * 501, "mode": "todos"},
        timeout=20,
    )
    assert r.status_code == 400


# --- Rate limit shared across all 3 modes ---

def test_rate_limit_shared_all_three_modes(session):
    user_id = f"rl3-{uuid.uuid4().hex[:8]}"
    payloads = [
        {"text": "1 Apfel", "mode": "grocery"},
        {"text": "Ibuprofen", "mode": "misc"},
        {"text": "Müll raus", "mode": "todos"},
        {"text": "1 Banane", "mode": "grocery"},
        {"text": "Pflaster", "mode": "misc"},
        {"text": "Rasen mähen", "mode": "todos"},
        {"text": "1 Brot", "mode": "grocery"},
        {"text": "Schrauben", "mode": "misc"},
        {"text": "Auto waschen", "mode": "todos"},
        {"text": "1 Käse", "mode": "grocery"},
    ]
    for i, p in enumerate(payloads):
        r = session.post(PARSE_URL, json={"user_id": user_id, **p}, timeout=30)
        assert r.status_code == 200, f"call {i+1} failed: {r.status_code} {r.text}"
    # 11th must be 429 regardless of mode
    r = session.post(
        PARSE_URL,
        json={"user_id": user_id, "text": "Müll", "mode": "todos"},
        timeout=30,
    )
    assert r.status_code == 429, f"Expected 429, got {r.status_code}"
    assert "Retry-After" in r.headers
