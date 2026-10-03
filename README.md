# Voice Communication System

An integrated real-time multilingual voice translation system featuring a React.js (Vite) frontend served dynamically through a Python FastAPI backend.

---

## Architecture Overview

```text
              Voice Communication System
                         │
                         ▼
                  localhost:8000
                         │
              ┌──────────┴──────────┐
              │                     │
        React Frontend          FastAPI Backend
        served by FastAPI        REST/API & WS
              │                     │
              └──────────┬──────────┘
                         │
               Real-time Translation &
               VoIP Call Functionality
```

---

## Quick Start (Single Command)

To build the frontend (if needed) and run the complete integrated application with **one command**:

```bash
python run.py
```

Open your browser and navigate to:
* **Web Application**: [http://localhost:8000](http://localhost:8000)
* **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc API Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Features

* **Unified Single Server**: Both the React single-page application and FastAPI REST/WebSocket endpoints operate on port `8000`.
* **SPA Routing Catch-All**: Deep links (`/chat`, `/voice`, etc.) and page refreshes work seamlessly without 404 errors.
* **Automatic Build Check**: `run.py` checks for `frontend/dist/index.html` and compiles the React app automatically if missing.
* **Force Rebuild**: Use `python run.py --build` to force a clean build of the React frontend before launching.
* **Developer Proxy**: Independent frontend dev mode (`cd frontend && npm run dev` on port `3000`) transparently proxies `/api` calls to port `8000`.

---

## Installation & Setup

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Run the Integrated Application
From the project root directory:
```bash
python run.py
```

---

## Project Structure

```text
voice_communication_chatbot/
│
├── frontend/
│   ├── src/                  # React source code
│   │   ├── components/       # UI components (AuthScreen, CallScreen, Dashboard)
│   │   ├── services/         # API & Token helpers
│   │   ├── App.jsx           # Root React app
│   │   └── main.jsx
│   ├── dist/                 # Production React build (served by FastAPI)
│   ├── package.json          # Node dependencies & build scripts
│   └── vite.config.js        # Vite configuration & proxy settings
│
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application & SPA static file server
│   │   ├── api/              # API Endpoints (auth, contacts, calls, ws)
│   │   ├── models/           # Database models
│   │   ├── database/         # DB session setup
│   │   └── utils/            # Configurations & helpers
│   ├── voicecall.db          # SQLite database
│   └── requirements.txt      # Python dependencies
│
├── run.py                    # Root single-command startup script
├── .env                      # Application environment configuration
└── README.md                 # Project documentation
```
