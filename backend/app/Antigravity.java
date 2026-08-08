import os
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles

from app.database.session import Base, engine
from app.utils.config import settings
from app.api import users, contacts, calls
import app.models.models  # Explicitly import all models to ensure metadata is populated for table creation

# Create DB Tables automatically if they don't exist
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Error creating database tables: {e}")

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local Flutter mobile/web development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication & Profile"])
app.include_router(contacts.router, prefix=f"{settings.API_V1_STR}/contacts", tags=["Contacts"])
app.include_router(calls.router, prefix=f"{settings.API_V1_STR}/calls", tags=["VoIP & Calls"])

# Serve media uploads as static files
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.UPLOAD_DIR), name="media")

@app.get("/")
def root_endpoint():
    return {
        "message": f"Welcome to the {settings.APP_NAME}!",
        "status": "healthy",
        "docs_url": "/docs"
    }
   

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.137.126:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)