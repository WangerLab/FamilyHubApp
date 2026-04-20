"""Backend tests for POST /api/brain-dump/parse endpoint."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shared-home-app-2.preview.emergentagent.com').rstrip('/')
PARSE_URL = f"{BASE_URL}/api/brain-dump/parse"

ALLOWED_CATEGORIES = {
    "Obst & Gemüse",
    "Frisches Fleisch & Fisch",
    "Bäckerei & Brot",
    "Milch & Alternativen",
    "Kühlregal & Tiefkühl",
    "Konserven & Saucen",
    "Gewürze",
    "Getränke",
    "Snacks & Süsses",
}
ALLOWED_UNITS = {"Stück", "g", "kg", "ml", "L", "Packung", "Dose", "Flasche", "Bund", "Glas"}


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# Validation tests

def test_empty_text_returns_400(session):
    r = session.post(PARSE_URL, json={"user_id": f"val-{uuid.uuid4().hex[:8]}", "text": ""}, timeout=20)
    assert r.status_code == 400
    assert r.json().get("detail") == "Text darf nicht leer sein."


def test_whitespace_text_returns_400(session):
    r = session.post(PARSE_URL, json={"user_id": f"val-{uuid.uuid4().hex[:8]}", "text": "   "}, timeout=20)
    assert r.status_code == 400
    assert r.json().get("detail") == "Text darf nicht leer sein."


def test_too_long_text_returns_400(session):
    long_text = "a" * 501
    r = session.post(PARSE_URL, json={"user_id": f"val-{uuid.uuid4().hex[:8]}", "text": long_text}, timeout=20)
    assert r.status_code == 400
    assert "zu lang" in r.json().get("detail", "").lower()


def test_missing_user_id_returns_400(session):
    # Pydantic returns 422 by default for missing fields; explicit empty user_id triggers 400
    r = session.post(PARSE_URL, json={"user_id": "", "text": "1 Apfel"}, timeout=20)
    assert r.status_code == 400
    assert "user_id" in r.json().get("detail", "").lower()


# Normal parse test

def test_normal_brain_dump_parses_items(session):
    user_id = f"normal-{uuid.uuid4().hex[:8]}"
    payload = {
        "user_id": user_id,
        "text": "2 Äpfel, 500g Hack, eine Packung Nudeln, Milch laktosefrei, 6 Eier, 1L Orangensaft",
    }
    r = session.post(PARSE_URL, json=payload, timeout=30)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text}"
    data = r.json()
    assert "items" in data
    items = data["items"]
    assert isinstance(items, list)
    assert len(items) >= 4, f"Expected at least 4 items, got {len(items)}: {items}"

    for it in items:
        assert "name" in it and isinstance(it["name"], str) and it["name"]
        assert "quantity" in it and isinstance(it["quantity"], (int, float)) and it["quantity"] > 0
        assert "unit" in it and it["unit"] in ALLOWED_UNITS, f"Bad unit: {it['unit']}"
        assert "category" in it and it["category"] in ALLOWED_CATEGORIES, f"Bad cat: {it['category']}"
        assert "note" in it and isinstance(it["note"], str)


# Rate-limit test (uses 11 LLM calls — keep last)

def test_rate_limit_429_after_10_requests(session):
    user_id = f"rl-{uuid.uuid4().hex[:8]}"
    success = 0
    for i in range(10):
        r = session.post(PARSE_URL, json={"user_id": user_id, "text": f"{i+1} Apfel"}, timeout=30)
        if r.status_code == 200:
            success += 1
        elif r.status_code == 429:
            pytest.fail(f"Rate limit hit early at request {i+1}")
        else:
            pytest.fail(f"Unexpected status {r.status_code} at request {i+1}: {r.text}")
    assert success == 10

    # 11th must be 429
    r = session.post(PARSE_URL, json={"user_id": user_id, "text": "1 Apfel"}, timeout=30)
    assert r.status_code == 429, f"Expected 429, got {r.status_code}: {r.text}"
    assert "Retry-After" in r.headers, f"Missing Retry-After header. Headers: {dict(r.headers)}"
    retry = int(r.headers["Retry-After"])
    assert retry > 0
