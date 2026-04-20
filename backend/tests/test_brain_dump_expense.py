"""Backend tests for POST /api/brain-dump/parse with mode='expense' (Session 7)."""
import os
import uuid
from datetime import datetime, timedelta

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
PARSE_URL = f"{BASE_URL}/api/brain-dump/parse"

ALLOWED_CATEGORIES = {"Essen", "Haushalt", "Transport", "Unterhaltung", "Sonstiges"}


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Schema test (3 items: Rewe / Tanken / Netflix) ---

def test_expense_mode_basic_extraction(session):
    payload = {
        "user_id": f"e-{uuid.uuid4().hex[:8]}",
        "text": "Rewe 45,80€ gestern, Tanken 62, Netflix 12,99",
        "mode": "expense",
    }
    r = session.post(PARSE_URL, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("mode") == "expense"
    items = data["items"]
    assert isinstance(items, list)
    assert len(items) >= 3, f"Expected >=3 items, got {len(items)}: {items}"

    # Schema for each
    for it in items:
        assert isinstance(it.get("description"), str) and it["description"]
        assert isinstance(it.get("amount"), (int, float)) and it["amount"] > 0
        assert it.get("category") in ALLOWED_CATEGORIES
        assert "expense_date" in it  # may be None
        # No grocery/todo fields
        assert "quantity" not in it
        assert "location_tag" not in it
        assert "priority" not in it

    # Amount checks
    amounts = sorted([round(it["amount"], 2) for it in items])
    # Expect 12.99, 45.8, 62.0 to all appear
    assert 12.99 in amounts, f"Netflix amount missing: {amounts}"
    assert 45.8 in amounts, f"Rewe amount missing: {amounts}"
    assert 62.0 in amounts, f"Tanken amount missing: {amounts}"

    # Category heuristics
    rewe = next((it for it in items if "rewe" in it["description"].lower()), None)
    assert rewe and rewe["category"] == "Essen", f"Rewe should be Essen: {rewe}"
    tanken = next((it for it in items if "tank" in it["description"].lower()), None)
    assert tanken and tanken["category"] == "Transport", f"Tanken should be Transport: {tanken}"
    netflix = next((it for it in items if "netflix" in it["description"].lower()), None)
    assert netflix and netflix["category"] == "Unterhaltung", f"Netflix should be Unterhaltung: {netflix}"

    # Gestern → expense_date for Rewe should be populated and = today-1
    if rewe["expense_date"] is not None:
        try:
            d = datetime.fromisoformat(rewe["expense_date"]).date()
            today = datetime.now().date()
            assert (today - d).days in (0, 1, 2), f"gestern should be today-1, got {d} (today={today})"
        except ValueError:
            pytest.fail(f"expense_date not ISO: {rewe['expense_date']}")


# --- Default category fallback ---

def test_expense_invalid_category_normalized_to_sonstiges(session):
    """Even if Claude returns a weird category, server normalises to Sonstiges."""
    payload = {
        "user_id": f"e-{uuid.uuid4().hex[:8]}",
        "text": "Irgendwas Random 19,99",
        "mode": "expense",
    }
    r = session.post(PARSE_URL, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    for it in data["items"]:
        assert it["category"] in ALLOWED_CATEGORIES


# --- Stale date null-out (>60 days) ---

def test_expense_stale_date_nulled(session):
    payload = {
        "user_id": f"e-{uuid.uuid4().hex[:8]}",
        "text": "Tanken gestern 50€, Rewe heute 30€",
        "mode": "expense",
    }
    r = session.post(PARSE_URL, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    cutoff = datetime.now() - timedelta(days=60)
    for it in r.json()["items"]:
        if it["expense_date"] is not None:
            try:
                d = datetime.fromisoformat(it["expense_date"])
            except ValueError:
                pytest.fail(f"expense_date not ISO: {it['expense_date']}")
            assert d >= cutoff, f"Stale date should be nulled: {it}"


# --- Backwards compat: no mode → grocery ---

def test_default_mode_still_grocery(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"bc-{uuid.uuid4().hex[:8]}", "text": "1 Apfel"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["mode"] == "grocery"
    if data["items"]:
        assert "category" in data["items"][0]
        assert "amount" not in data["items"][0]


# --- Validation ---

def test_expense_empty_text_400(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"v-{uuid.uuid4().hex[:8]}", "text": "", "mode": "expense"},
        timeout=20,
    )
    assert r.status_code == 400


def test_expense_too_long_400(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"v-{uuid.uuid4().hex[:8]}", "text": "x" * 501, "mode": "expense"},
        timeout=20,
    )
    assert r.status_code == 400


# --- Rate limit shared across ALL 4 modes ---

def test_rate_limit_shared_all_four_modes(session):
    user_id = f"rl4-{uuid.uuid4().hex[:8]}"
    payloads = [
        {"text": "1 Apfel", "mode": "grocery"},
        {"text": "Ibuprofen", "mode": "misc"},
        {"text": "Müll raus", "mode": "todos"},
        {"text": "Rewe 30€", "mode": "expense"},
        {"text": "1 Banane", "mode": "grocery"},
        {"text": "Pflaster", "mode": "misc"},
        {"text": "Auto waschen", "mode": "todos"},
        {"text": "Tanken 50€", "mode": "expense"},
        {"text": "1 Brot", "mode": "grocery"},
        {"text": "Schrauben", "mode": "misc"},
    ]
    for i, p in enumerate(payloads):
        r = session.post(PARSE_URL, json={"user_id": user_id, **p}, timeout=30)
        assert r.status_code == 200, f"call {i+1} failed: {r.status_code} {r.text}"
    # 11th in any mode → 429
    r = session.post(
        PARSE_URL,
        json={"user_id": user_id, "text": "Netflix 12,99", "mode": "expense"},
        timeout=30,
    )
    assert r.status_code == 429, f"Expected 429, got {r.status_code}"
    assert "Retry-After" in r.headers
