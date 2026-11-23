import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
backend_env = Path(__file__).resolve().parent.parent / ".env"
if backend_env.exists():
    load_dotenv(backend_env)

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    TUTOR_RATE_LIMIT_PER_HOUR: int = int(os.getenv("TUTOR_RATE_LIMIT_PER_HOUR", "30"))

settings = Settings()
