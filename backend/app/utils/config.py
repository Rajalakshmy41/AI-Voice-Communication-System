import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Language-Agnostic Voice Call API"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # JWT Auth Settings
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkeyforlanguageagnosticvoipapp")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database Settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "voicecall")
    
    # Dual database URL: If PostgreSQL isn't configured/available, it defaults to SQLite
    @property
    def DATABASE_URL(self) -> str:
        url = os.getenv("DATABASE_URL")
        if url:
            return url
        # Check if we should use SQLite
        if os.getenv("USE_SQLITE", "true").lower() == "true":
            return "sqlite:///./voicecall.db"
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # AI Pipeline Settings
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "tiny")  # tiny, base, small, medium, large
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")  # cpu, cuda
    USE_MOCK_AI: bool = os.getenv("USE_MOCK_AI", "true").lower() == "true"  # Set true for fast local development without heavy models
    
    # Storage settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./media")
    
    class Config:
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "original"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "translated"), exist_ok=True)
