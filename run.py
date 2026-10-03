#!/usr/bin/env python3
"""
Voice Communication System - Single Application Launcher
Runs the integrated React Frontend (served by FastAPI) and FastAPI Backend on http://localhost:8000
"""

import os
import sys
import socket
import argparse
import subprocess

# Define Base Paths
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
FRONTEND_DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

# Ensure backend directory is in sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load .env file explicitly if present at root
env_file_path = os.path.join(ROOT_DIR, ".env")
if os.path.exists(env_file_path):
    with open(env_file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key not in os.environ:
                    os.environ[key] = val


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if target port is already occupied."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex((host, port)) == 0


def build_frontend_if_needed(force_rebuild: bool = False):
    """
    Checks if frontend/dist exists. If missing or force_rebuild is True, executes npm run build.
    """
    index_html = os.path.join(FRONTEND_DIST_DIR, "index.html")
    needs_build = force_rebuild or not os.path.exists(index_html)

    if needs_build:
        print("\n[*] Building React frontend (npm run build)...")
        if not os.path.exists(FRONTEND_DIR):
            print(f"[!] Error: Frontend directory '{FRONTEND_DIR}' does not exist.", file=sys.stderr)
            sys.exit(1)
        
        try:
            npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
            result = subprocess.run([npm_cmd, "run", "build"], cwd=FRONTEND_DIR, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"[!] npm run build output:\n{result.stdout}\n{result.stderr}")
                print("[!] Trying npx vite build...")
                
                npx_cmd = "npx.cmd" if sys.platform == "win32" else "npx"
                result_npx = subprocess.run([npx_cmd, "vite", "build"], cwd=FRONTEND_DIR, capture_output=True, text=True)
                if result_npx.returncode != 0:
                    print(f"[!] npx vite build output:\n{result_npx.stdout}\n{result_npx.stderr}")
                    print("[!] CRITICAL: Failed to build React frontend. Stopping server launch.", file=sys.stderr)
                    sys.exit(1)

            print("[+] React frontend build completed successfully!")
        except Exception as e:
            print(f"[!] Build execution failed: {e}", file=sys.stderr)
            print("[!] Please run 'npm run build' inside the 'frontend' directory manually.", file=sys.stderr)
            sys.exit(1)
    else:
        print("[+] React frontend build found in 'frontend/dist/'. (Use --build to force rebuild)")


def main():
    default_host = os.getenv("HOST", "0.0.0.0")
    default_port = int(os.getenv("PORT", "8000"))

    parser = argparse.ArgumentParser(description="Voice Communication System Single Application Server")
    parser.add_argument("--host", default=default_host, help=f"Host address to bind (default: {default_host})")
    parser.add_argument("--port", type=int, default=default_port, help=f"Port to listen on (default: {default_port})")
    parser.add_argument("--build", action="store_true", help="Force rebuilding the frontend before launch")

    args = parser.parse_args()

    # Step 1: Check port availability
    if is_port_in_use(args.port):
        print(f"\n[!] WARNING: Port {args.port} appears to be in use by another process.", file=sys.stderr)
        print(f"[!] If binding fails, please close the process using port {args.port}.\n", file=sys.stderr)

    # Step 2: Ensure frontend build exists
    build_frontend_if_needed(force_rebuild=args.build)

    # Step 3: Set environment variable for backend to locate dist
    os.environ["FRONTEND_DIST_DIR"] = FRONTEND_DIST_DIR

    # Step 4: Import uvicorn and the FastAPI app directly in process
    try:
        import uvicorn
        from app.main import app as fastapi_app
    except Exception as e:
        print(f"\n[!] ERROR loading backend FastAPI application: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

    display_host = "localhost" if args.host == "0.0.0.0" else args.host
    print("\n" + "=" * 65)
    print(" 🚀 VOICE COMMUNICATION SYSTEM IS RUNNING")
    print("=" * 65)
    print(f" ► Application URL  : http://{display_host}:{args.port}")
    print(f" ► Swagger API Docs : http://{display_host}:{args.port}/docs")
    print(f" ► ReDoc API Docs   : http://{display_host}:{args.port}/redoc")
    print("=" * 65 + "\n")

    # Step 5: Run Uvicorn server programmatically with reload=False
    try:
        uvicorn.run(
            fastapi_app,
            host=args.host,
            port=args.port,
            reload=False,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n[*] Voice Communication System server stopped by user.")
    except Exception as e:
        print(f"\n[!] ERROR starting FastAPI server: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
