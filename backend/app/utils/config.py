import os
from pydantic_settings import BaseSettings

# Load .env file explicitly if available from project root
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
env_path = os.path.join(project_root, ".env")
if not os.path.exists(env_path):
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key not in os.environ:
                    os.environ[key] = val


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = os.getenv("APP_NAME", "Voice Communication System")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    API_V1_STR: str = "/api/v1"

    # Security & JWT Auth Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secure-random-jwt-secret-key-change-in-env")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @property
    def SECRET_KEY(self) -> str:
        return self.JWT_SECRET_KEY

    # Database Settings
    USE_SQLITE: bool = os.getenv("USE_SQLITE", "True").lower() == "true"
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "voicecall")

    @property
    def DATABASE_URL(self) -> str:
        url = os.getenv("DATABASE_URL")
        if url:
            if url.startswith("sqlite:///./"):
                db_filename = url.replace("sqlite:///./", "")
                root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
                abs_db_path = os.path.abspath(os.path.join(root, "backend", db_filename))
                return f"sqlite:///{abs_db_path}"
            return url
        if self.USE_SQLITE:
            root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            abs_db_path = os.path.abspath(os.path.join(root, "backend", "voicecall.db"))
            return f"sqlite:///{abs_db_path}"
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # AI Pipeline Settings
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "tiny")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    USE_MOCK_AI: bool = os.getenv("USE_MOCK_AI", "True").lower() == "true"

    # Storage Settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./media")

    @property
    def UPLOAD_DIR_PATH(self) -> str:
        raw_dir = self.UPLOAD_DIR
        if not os.path.isabs(raw_dir):
            root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            return os.path.abspath(os.path.join(root, raw_dir))
        return raw_dir

    class Config:
        case_sensitive = True


settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.UPLOAD_DIR_PATH, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR_PATH, "original"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR_PATH, "translated"), exist_ok=True)


