import os
from pydantic_settings import BaseSettings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "billing_saas.db"))
DEFAULT_SQLITE_URL = f"sqlite:///{DB_PATH.replace('\\', '/')}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Billing & Inventory Management SaaS"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "super-secret-saas-jwt-signing-key-billing-2026-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Primary DB: PostgreSQL. Fallback to absolute SQLite path
    DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
