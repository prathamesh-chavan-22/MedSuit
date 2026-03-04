# MedSuite — Hospital IPD Management System

MedSuite is a full-stack **In-Patient Department (IPD) management platform** designed for hospitals. It gives doctors, nurses, and administrators a single interface to manage patient admissions, bed assignments, vital-sign monitoring, nursing tasks, audio notes, and clinical alerts — all in real time.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Backend setup](#2-backend-setup)
  - [3. Frontend setup](#3-frontend-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [API Overview](#api-overview)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

| Concern | Solution |
|---|---|
| Patient lifecycle | Admit, monitor, and discharge patients with full records |
| Bed management | Real-time bed availability and ward assignment |
| Vitals monitoring | Automated vital-sign ingestion with threshold-based alerts |
| Audio notes | Voice-to-text clinical notes via Google Cloud Speech-to-Text |
| Task tracking | Assign and track nursing/doctor tasks per patient |
| Alerts | Severity-graded clinical alerts triggered by vitals or staff |
| Auth & RBAC | JWT-based authentication with Doctor / Nurse / Admin roles |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│          React 19 + Vite  (localhost:5173)              │
└───────────────────────┬─────────────────────────────────┘
                        │  HTTP / REST (Axios)
┌───────────────────────▼─────────────────────────────────┐
│              FastAPI  (localhost:8000)                   │
│   Auth · Patients · Beds · Vitals · Tasks · Alerts      │
│                   Audio (Google STT)                    │
└───────────────────────┬─────────────────────────────────┘
                        │  SQLAlchemy ORM
┌───────────────────────▼─────────────────────────────────┐
│       SQLite (dev)  /  PostgreSQL (production)          │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| FastAPI 0.110 | REST API framework |
| SQLAlchemy 2 | ORM & database layer |
| Alembic | Database migrations |
| Pydantic v2 | Request / response validation |
| python-jose | JWT signing & verification |
| passlib (bcrypt) | Password hashing |
| Google Cloud Speech | Audio-to-text transcription |
| Uvicorn | ASGI server |
| python-dotenv | Environment variable loading |

### Frontend
| Package | Purpose |
|---|---|
| React 19 | UI library |
| Vite 7 | Build tool & dev server |
| React Router v7 | Client-side routing |
| TanStack Query v5 | Server state & caching |
| Axios | HTTP client |
| Recharts | Vital-sign charts |
| Lucide React | Icon library |

---

## Repository Structure

```
MedSuite/
├── README.md                   ← You are here
├── backend/
│   ├── README.md               ← Backend-specific documentation
│   ├── main.py                 ← FastAPI app entry point
│   ├── requirements.txt
│   └── app/
│       ├── auth.py             ← JWT helpers & role guards
│       ├── database.py         ← SQLAlchemy engine & session
│       ├── models.py           ← ORM models
│       ├── schemas.py          ← Pydantic schemas
│       └── routers/
│           ├── auth.py
│           ├── patients.py
│           ├── beds.py
│           ├── vitals.py
│           ├── audio.py
│           ├── tasks.py
│           └── alerts.py
└── frontend/
    ├── README.md               ← Frontend-specific documentation
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx             ← Root router & providers
        ├── api.js              ← Axios instance
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── Navbar.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Patients.jsx
            ├── PatientDetail.jsx
            ├── Beds.jsx
            └── Tasks.jsx
```

---

## Getting Started

### Prerequisites

| Tool | Minimum version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| Git | any recent |
| Google Cloud credentials *(optional)* | for audio transcription |

### 1. Clone the repository

```bash
git clone https://github.com/your-org/medsuite.git
cd medsuite
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env   # edit as needed (see Environment Variables section)

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend

npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
# ── Database ──────────────────────────────────────────────
DATABASE_URL=sqlite:///./medsuite.db
# For PostgreSQL: postgresql://user:password@localhost:5432/medsuite

# ── JWT ───────────────────────────────────────────────────
SECRET_KEY=change_me_to_a_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Google Cloud Speech-to-Text (optional) ────────────────
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

> If `GOOGLE_APPLICATION_CREDENTIALS` is not set, audio upload will still work but the transcript will contain a placeholder message.

---

## Running the Application

Run both servers concurrently (two terminals):

```bash
# Terminal 1 — Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Key Features

- **Dashboard** — live overview of bed occupancy, active alerts, and pending tasks
- **Patient management** — admit, search, view full profile with vitals history
- **Bed management** — view wards, assign/release beds, maintenance status
- **Vitals monitoring** — mock or real-time ingest with automatic alert generation when thresholds are breached (HR, SpO2, temperature)
- **Audio notes** — record voice notes at the bedside; Google STT converts them to searchable text
- **Task management** — create, assign, and progress-track nursing/doctor tasks
- **Alerts** — severity-graded (info / warning / critical) with per-patient feed
- **Role-based access** — route-level and endpoint-level guards per user role

---

## User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access — user management, all resources |
| `doctor` | Patients, vitals, audio notes, alerts (read/write) |
| `nurse` | Patients (read), tasks (read/write), vitals (read), audio notes |

---

## API Overview

| Router | Base path | Description |
|---|---|---|
| Auth | `/auth` | Login, register, current user |
| Patients | `/patients` | CRUD for patient records |
| Beds | `/beds` | Bed inventory and assignment |
| Vitals | `/vitals` | Vital-sign ingest and history |
| Audio | `/audio` | Upload and list audio notes |
| Tasks | `/tasks` | Task CRUD and status updates |
| Alerts | `/alerts` | Alert feed and acknowledgement |

Full interactive documentation is auto-generated by FastAPI at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

---

## Contributing

1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`).
2. Follow existing code style — Black + isort for Python, ESLint for JavaScript.
3. Write or update tests where applicable.
4. Open a pull request with a clear description of the change.

---

## License

This project is licensed under the [MIT License](LICENSE).
