from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import (
    auth,
    patients,
    beds,
    audio,
    vitals,
    tasks,
    alerts,
    consents,
    rounding,
    clinical_notes,
    labs,
    timeline,
    ai_chat,
    medication_intake,
    food_intake,
)

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Vitalis IPD Management",
    description="Hospital In-Patient Department management system API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "https://composed-violently-coyote.ngrok-free.app",
        "http://composed-violently-coyote.ngrok-free.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(beds.router)
app.include_router(audio.router)
app.include_router(vitals.router)
app.include_router(tasks.router)
app.include_router(alerts.router)
app.include_router(consents.router)
app.include_router(rounding.router)
app.include_router(clinical_notes.router)
app.include_router(labs.router)
app.include_router(timeline.router)
app.include_router(ai_chat.router)
app.include_router(medication_intake.router)
app.include_router(food_intake.router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "service": "Vitalis IPD API"}
