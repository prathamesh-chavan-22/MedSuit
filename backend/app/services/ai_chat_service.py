"""AI Clinical Decision Support service powered by Mistral AI.

Provides patient-context-aware chat and proactive risk scanning.
"""

import json
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app import models

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
MODEL = "mistral-small-latest"


# ─── Context Builder ─────────────────────────────────────────────────────────


def _fmt_dt(dt: Optional[datetime]) -> str:
    if not dt:
        return "N/A"
    return dt.strftime("%Y-%m-%d %H:%M")


def build_patient_context(db: Session, patient_id: int) -> dict:
    """Gather a rich snapshot of the patient's clinical state."""

    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        return {"error": "Patient not found"}

    # Demographics
    demographics = {
        "name": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "weight_kg": patient.weight_kg,
        "height_cm": patient.height_cm,
        "diagnosis": patient.diagnosis,
        "comorbidities": patient.comorbidities,
        "medications": patient.medications,
        "allergies": patient.allergies,
        "mental_status": patient.mental_status,
        "admission_type": patient.admission_type.value if patient.admission_type else None,
        "patient_status": patient.patient_status.value if patient.patient_status else None,
        "admission_date": _fmt_dt(patient.admission_at),
        "is_serious": patient.is_serious,
        "fall_risk": patient.fall_risk,
        "infection_risk": patient.infection_risk,
    }

    # Latest vitals (last 10)
    vitals_rows = (
        db.query(models.VitalReading)
        .filter(models.VitalReading.patient_id == patient_id)
        .order_by(models.VitalReading.recorded_at.desc())
        .limit(10)
        .all()
    )
    vitals = [
        {
            "recorded_at": _fmt_dt(v.recorded_at),
            "heart_rate": v.heart_rate,
            "spo2": v.spo2,
            "bp": f"{v.blood_pressure_sys}/{v.blood_pressure_dia}",
            "temperature": v.temperature,
        }
        for v in vitals_rows
    ]

    # Latest labs (last 20)
    lab_rows = (
        db.query(models.LabResult)
        .filter(models.LabResult.patient_id == patient_id)
        .order_by(models.LabResult.measured_at.desc())
        .limit(20)
        .all()
    )
    labs = [
        {
            "test": l.test_name,
            "value": l.value,
            "unit": l.unit,
            "ref_range": f"{l.reference_low}-{l.reference_high}" if l.reference_low is not None else None,
            "abnormal": l.is_abnormal,
            "date": _fmt_dt(l.measured_at),
        }
        for l in lab_rows
    ]

    # Clinical notes (last 5)
    note_rows = (
        db.query(models.ClinicalNote)
        .filter(models.ClinicalNote.patient_id == patient_id)
        .order_by(models.ClinicalNote.created_at.desc())
        .limit(5)
        .all()
    )
    notes = [
        {
            "type": n.note_type.value if hasattr(n.note_type, "value") else n.note_type,
            "status": n.status.value if hasattr(n.status, "value") else n.status,
            "date": _fmt_dt(n.created_at),
            "S": n.subjective[:200] if n.subjective else "",
            "O": n.objective[:200] if n.objective else "",
            "A": n.assessment[:200] if n.assessment else "",
            "P": n.plan[:200] if n.plan else "",
        }
        for n in note_rows
    ]

    # Active alerts (last 10 unread)
    alert_rows = (
        db.query(models.Alert)
        .filter(
            models.Alert.patient_id == patient_id,
            models.Alert.is_read == False,  # noqa: E712
        )
        .order_by(models.Alert.created_at.desc())
        .limit(10)
        .all()
    )
    alerts = [
        {
            "severity": a.severity.value if hasattr(a.severity, "value") else a.severity,
            "message": a.message,
            "date": _fmt_dt(a.created_at),
        }
        for a in alert_rows
    ]

    return {
        "demographics": demographics,
        "vitals": vitals,
        "labs": labs,
        "clinical_notes": notes,
        "active_alerts": alerts,
    }


def _context_to_text(ctx: dict) -> str:
    """Format the context dict into a readable text block for the LLM."""
    parts = []

    d = ctx.get("demographics", {})
    parts.append("## Patient Demographics")
    parts.append(
        f"Name: {d.get('name')} | Age: {d.get('age')} | Gender: {d.get('gender')} | "
        f"Blood Group: {d.get('blood_group')}"
    )
    parts.append(f"Diagnosis: {d.get('diagnosis', 'N/A')}")
    parts.append(f"Comorbidities: {d.get('comorbidities', 'None')}")
    parts.append(f"Medications: {d.get('medications', 'None')}")
    parts.append(f"Allergies: {d.get('allergies', 'None')}")
    parts.append(f"Status: {d.get('patient_status')} | Admission: {d.get('admission_date')}")
    flags = []
    if d.get("is_serious"):
        flags.append("SERIOUS")
    if d.get("fall_risk"):
        flags.append("FALL RISK")
    if d.get("infection_risk"):
        flags.append("INFECTION RISK")
    if flags:
        parts.append(f"⚠ Flags: {', '.join(flags)}")

    if ctx.get("vitals"):
        parts.append("\n## Recent Vitals (newest first)")
        for v in ctx["vitals"][:5]:
            parts.append(
                f"  [{v['recorded_at']}] HR:{v['heart_rate']} SpO2:{v['spo2']}% "
                f"BP:{v['bp']} Temp:{v['temperature']}°C"
            )

    if ctx.get("labs"):
        parts.append("\n## Recent Labs (newest first)")
        for lb in ctx["labs"][:10]:
            flag = " ⚠ ABNORMAL" if lb["abnormal"] else ""
            parts.append(
                f"  [{lb['date']}] {lb['test']}: {lb['value']} {lb['unit'] or ''}{flag}"
            )

    if ctx.get("clinical_notes"):
        parts.append("\n## Recent Clinical Notes")
        for n in ctx["clinical_notes"][:3]:
            parts.append(f"  [{n['date']}] Type: {n['type']} | Status: {n['status']}")
            parts.append(f"    S: {n['S']}")
            parts.append(f"    A: {n['A']}")
            parts.append(f"    P: {n['P']}")

    if ctx.get("active_alerts"):
        parts.append("\n## Active Alerts")
        for a in ctx["active_alerts"]:
            parts.append(f"  [{a['severity'].upper()}] {a['message']} ({a['date']})")

    return "\n".join(parts)


# ─── System Prompts ───────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """You are MedSuite AI, a clinical decision support assistant integrated into a hospital IPD (In-Patient Department) management system.

You have access to the patient's full clinical context below. Use it to answer the doctor's questions accurately, concisely, and clinically.

Rules:
- Always ground your answers in the provided patient data.
- If something is not in the data, say so explicitly.
- Highlight abnormal values, trends, and potential risks.
- Use medical terminology appropriate for a physician audience.
- Format responses with markdown: use **bold** for critical items, bullet lists for clarity.
- Keep responses concise but thorough. Aim for 3-8 sentences unless the question requires more detail.
- Never fabricate clinical data. Only reference what is provided.
- If asked about drug interactions or contraindications, provide general medical knowledge but remind the doctor to verify with a pharmacist.

PATIENT CONTEXT:
{context}
"""

RISK_SCAN_SYSTEM_PROMPT = """You are MedSuite AI running a proactive clinical risk scan.

Analyze the patient data below and identify ALL potential clinical risks, concerns, or items needing attention.

For each risk found, return a JSON array of objects with:
- "severity": "critical" | "warning" | "info"
- "title": short title (max 10 words)
- "message": detailed explanation (1-2 sentences)
- "recommendation": suggested action (1 sentence)

Rules:
- Check for: abnormal vitals trends, abnormal lab values, drug-allergy interactions, drug-drug interactions, missing follow-ups, concerning symptom patterns.
- Be thorough but avoid false alarms.
- If everything looks normal, return an array with a single "info" level item saying "No significant risks identified."
- Return ONLY valid JSON array, no other text.

PATIENT DATA:
{context}
"""

GENERAL_SYSTEM_PROMPT = """You are MedSuite AI, a helpful assistant for hospital staff.

You can help with:
- General medical knowledge questions
- Hospital workflow guidance
- MedSuite feature explanations

You do NOT have access to any specific patient data right now.
If the user asks about a specific patient, tell them to open the patient's detail page first so you can access their clinical context.

Keep responses concise, professional, and helpful. Use markdown formatting."""


# ─── API Calls ────────────────────────────────────────────────────────────────


def chat_with_context(
    db: Session,
    patient_id: Optional[int],
    user_message: str,
    history: list[dict],
) -> dict:
    """Send a contextual chat message to Mistral and return the response."""

    if not MISTRAL_API_KEY:
        return {
            "reply": "⚠ **Mistral API key not configured.** Please add `MISTRAL_API_KEY` to your backend `.env` file to enable AI features.",
            "risk_flags": [],
            "context_summary": "",
        }

    # Build context
    context_text = ""
    if patient_id:
        ctx = build_patient_context(db, patient_id)
        if "error" in ctx:
            return {"reply": f"Error: {ctx['error']}", "risk_flags": [], "context_summary": ""}
        context_text = _context_to_text(ctx)
        system_prompt = CHAT_SYSTEM_PROMPT.format(context=context_text)
    else:
        system_prompt = GENERAL_SYSTEM_PROMPT

    # Build messages array
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 10 exchanges max)
    for msg in history[-20:]:
        role = msg.get("role", "user")
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": msg.get("text", "")})

    messages.append({"role": "user", "content": user_message})

    try:
        response = httpx.post(
            MISTRAL_URL,
            headers={"Authorization": f"Bearer {MISTRAL_API_KEY}"},
            json={
                "model": MODEL,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 1024,
            },
            timeout=45.0,
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]

        return {
            "reply": reply,
            "risk_flags": [],
            "context_summary": f"Context loaded for patient (ID: {patient_id})" if patient_id else "General mode",
        }
    except httpx.HTTPStatusError as e:
        return {
            "reply": f"⚠ Mistral API error ({e.response.status_code}). Please try again.",
            "risk_flags": [],
            "context_summary": "",
        }
    except Exception as e:
        return {
            "reply": f"⚠ AI service unavailable: {str(e)[:100]}",
            "risk_flags": [],
            "context_summary": "",
        }


def run_risk_scan(db: Session, patient_id: int) -> list[dict]:
    """Proactively scan patient data for clinical risks."""

    if not MISTRAL_API_KEY:
        return [
            {
                "severity": "info",
                "title": "AI Not Configured",
                "message": "Mistral API key not set. Add MISTRAL_API_KEY to backend .env.",
                "recommendation": "Configure AI to enable risk scanning.",
            }
        ]

    ctx = build_patient_context(db, patient_id)
    if "error" in ctx:
        return [{"severity": "warning", "title": "Error", "message": ctx["error"], "recommendation": "Check patient ID."}]

    context_text = _context_to_text(ctx)
    system_prompt = RISK_SCAN_SYSTEM_PROMPT.format(context=context_text)

    try:
        response = httpx.post(
            MISTRAL_URL,
            headers={"Authorization": f"Bearer {MISTRAL_API_KEY}"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Run a comprehensive clinical risk scan now."},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": 1024,
            },
            timeout=45.0,
        )
        response.raise_for_status()

        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        # Handle both {"flags": [...]} and direct [...] formats
        if isinstance(parsed, list):
            flags = parsed
        elif isinstance(parsed, dict):
            flags = parsed.get("flags", parsed.get("risks", parsed.get("results", [parsed])))
        else:
            flags = []

        # Validate each flag
        validated = []
        for f in flags:
            if isinstance(f, dict):
                validated.append({
                    "severity": f.get("severity", "info"),
                    "title": f.get("title", "Finding"),
                    "message": f.get("message", ""),
                    "recommendation": f.get("recommendation", ""),
                })

        return validated or [
            {"severity": "info", "title": "All Clear", "message": "No significant risks identified.", "recommendation": "Continue current care plan."}
        ]

    except Exception as e:
        print(f"Warning: Risk scan error: {e}")
        return [
            {
                "severity": "warning",
                "title": "Scan Failed",
                "message": f"Could not complete risk scan: {str(e)[:80]}",
                "recommendation": "Try again later or review manually.",
            }
        ]
