"""Backend tests for POST /api/brain-dump/parse with mode parameter (Session 4)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
PARSE_URL = f"{BASE_URL}/api/brain-dump/parse"

ALLOWED_MISC_LOCATIONS = {
    "Apotheke", "Baumarkt", "Drogerie",
    "Zoohandlung", "Kleidung", "Sonstiges",
}


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Backwards compat: default mode ---

def test_default_mode_is_grocery(session):
    """No mode param -> grocery schema, response includes mode='grocery'."""
    r = session.post(
        PARSE_URL,
        json={"user_id": f"bc-{uuid.uuid4().hex[:8]}", "text": "1 Apfel"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("mode") == "grocery"
    assert isinstance(data.get("items"), list) and len(data["items"]) >= 1
    item = data["items"][0]
    # Grocery shape
    assert "category" in item and "quantity" in item and "unit" in item
    assert item["category"] == "Obst & Gemüse" or "Apfel" in item["name"]


def test_explicit_mode_grocery_works(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"g-{uuid.uuid4().hex[:8]}", "text": "2 Bananen, 1L Milch", "mode": "grocery"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["mode"] == "grocery"
    assert len(data["items"]) >= 1
    for it in data["items"]:
        assert "category" in it
        assert "location_tag" not in it


# --- New: misc mode ---

def test_misc_mode_returns_location_tags(session):
    payload = {
        "user_id": f"m-{uuid.uuid4().hex[:8]}",
        "text": "Ibuprofen, 3 Batterien AA, Hundefutter Nassfutter, Schrauben 4mm, Zahnpasta, Socken",
        "mode": "misc",
    }
    r = session.post(PARSE_URL, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["mode"] == "misc"
    items = data["items"]
    assert isinstance(items, list)
    assert len(items) >= 4, f"Expected >=4 items, got {len(items)}: {items}"

    for it in items:
        assert "name" in it and isinstance(it["name"], str) and it["name"]
        assert "location_tag" in it and it["location_tag"] in ALLOWED_MISC_LOCATIONS
        assert "note" in it and isinstance(it["note"], str)
        # Should NOT contain grocery fields
        assert "category" not in it
        assert "quantity" not in it
        assert "unit" not in it

    tags = {it["location_tag"] for it in items}
    names = " ".join(it["name"] for it in items).lower()
    # At least 3 different tags expected for diverse input
    assert len(tags) >= 3, f"Expected diverse tags, got {tags}"
    # Specific assertions: medical, pet, hardware, drugstore, clothing should map well
    if "ibuprofen" in names:
        ibu = next((it for it in items if "ibuprofen" in it["name"].lower()), None)
        if ibu:
            assert ibu["location_tag"] == "Apotheke"


def test_misc_mode_validation_empty_text(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"v-{uuid.uuid4().hex[:8]}", "text": "", "mode": "misc"},
        timeout=20,
    )
    assert r.status_code == 400


def test_misc_mode_validation_too_long(session):
    r = session.post(
        PARSE_URL,
        json={"user_id": f"v-{uuid.uuid4().hex[:8]}", "text": "x" * 501, "mode": "misc"},
        timeout=20,
    )
    assert r.status_code == 400


# --- Rate limit shared across modes ---

def test_rate_limit_shared_across_modes(session):
    user_id = f"rlboth-{uuid.uuid4().hex[:8]}"
    # 5 grocery + 5 misc = 10, the 11th (misc) must be rate-limited
    for i in range(5):
        r = session.post(
            PARSE_URL,
            json={"user_id": user_id, "text": f"{i+1} Apfel", "mode": "grocery"},
            timeout=30,
        )
        assert r.status_code == 200, f"grocery {i}: {r.status_code} {r.text}"
    for i in range(5):
        r = session.post(
            PARSE_URL,
            json={"user_id": user_id, "text": f"Ibuprofen {i+1}", "mode": "misc"},
            timeout=30,
        )
        assert r.status_code == 200, f"misc {i}: {r.status_code} {r.text}"
    # 11th call across both modes must be 429
    r = session.post(
        PARSE_URL,
        json={"user_id": user_id, "text": "1 Apfel", "mode": "grocery"},
        timeout=30,
    )
    assert r.status_code == 429, f"Expected 429, got {r.status_code}"
    assert "Retry-After" in r.headers
