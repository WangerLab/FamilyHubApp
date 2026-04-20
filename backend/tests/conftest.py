"""Shared pytest fixtures + env loading for backend tests."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env so REACT_APP_BACKEND_URL is available to test modules
FRONTEND_ENV = Path(__file__).resolve().parent.parent.parent / "frontend" / ".env"
if FRONTEND_ENV.exists():
    load_dotenv(FRONTEND_ENV)
