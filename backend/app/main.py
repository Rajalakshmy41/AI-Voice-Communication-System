import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

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
    allow_origins=["*"],  # Allow all for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication & Profile"])
app.include_router(contacts.router, prefix=f"{settings.API_V1_STR}/contacts", tags=["Contacts"])
app.include_router(calls.router, prefix=f"{settings.API_V1_STR}/calls", tags=["VoIP & Calls"])

# Serve media uploads as static files
os.makedirs(settings.UPLOAD_DIR_PATH, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.UPLOAD_DIR_PATH), name="media")

# Frontend Dist Path
FRONTEND_DIST_DIR = os.path.abspath(
    os.getenv(
        "FRONTEND_DIST_DIR",
        os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    )
)

# Ensure assets directory exists and mount static assets
assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
os.makedirs(assets_dir, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "message": f"Welcome to {settings.APP_NAME}!",
        "status": "healthy",
        "docs_url": "/docs"
    }


# Catch-all route to serve the React SPA and handle client-side routing
@app.get("/{full_path:path}")
async def serve_spa(request: Request, full_path: str):
    clean_path = full_path.lstrip("/")
    
    # Do not intercept API, Swagger docs, Redoc, OpenAPI schema, or media static uploads
    if (
        clean_path.startswith("api") or 
        clean_path.startswith("docs") or 
        clean_path.startswith("redoc") or 
        clean_path == "openapi.json" or
        clean_path.startswith("media")
    ):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})

    # Check if a specific static file exists in frontend/dist (e.g., favicon.ico, logo.png, vite.svg)
    requested_file = os.path.join(FRONTEND_DIST_DIR, clean_path)
    if clean_path and os.path.isfile(requested_file):
        return FileResponse(requested_file)

    # Fallback to index.html for React SPA client-side routes (e.g. /, /chat, /voice, /login, /dashboard)
    index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)

    return JSONResponse(
        status_code=404,
        content={
            "detail": "Frontend build not found. Please build the React frontend using 'npm run build' inside the frontend directory."
        }
    )


