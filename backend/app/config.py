"""
PharmaGuard Configuration
"""
import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    APP_NAME: str = "PharmaGuard"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-1.5-pro"

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    # Upload
    MAX_VCF_SIZE_MB: int = 5

    # Supported drugs & gene mappings
    SUPPORTED_DRUGS: dict = {
        "CODEINE": "CYP2D6",
        "WARFARIN": "CYP2C9",
        "CLOPIDOGREL": "CYP2C19",
        "SIMVASTATIN": "SLCO1B1",
        "AZATHIOPRINE": "TPMT",
        "FLUOROURACIL": "DPYD",
    }

    SUPPORTED_GENES: list = [
        "CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
