#!/usr/bin/env python3
"""
MedSuite Live Patient Simulator
================================
Continuously pushes mock vital-sign readings for **all current patients**
(or a single patient via ``--patient-id``) every N seconds, simulating
live bedside monitors.

Vitals are generated using a *stateful random walk* so successive readings
change smoothly (e.g. HR 72 → 72.3 → 71.8) rather than jumping randomly
across the full physiological range each tick.

Usage:
    # Simulate ALL patients (auto-discovers via API):
    python scripts/live_simulator.py

    # Simulate a single patient:
    python scripts/live_simulator.py --patient-id 3

Arguments:
    --patient-id  (optional)  Limit simulation to this single patient ID.
                              If omitted, ALL patients are simulated.
    --url         (optional)  Base URL of the MedSuite API.
                              Defaults to http://localhost:8000
    --token       (optional)  Bearer JWT token for authentication.
                              You can also set the MEDSUITE_TOKEN env variable.
    --interval    (optional)  Seconds between readings. Defaults to 0.5.

Press Ctrl+C to stop the simulator.
"""

import argparse
import os
import sys
import time
import random
import requests

DEFAULT_URL = "http://localhost:8000"
DEFAULT_INTERVAL = 0.5

# ─── Walk Configuration ───────────────────────────────────────────────────────
VITAL_CONFIG = {
    "heart_rate":         dict(baseline=75.0,  lo=50.0,  hi=115.0, step=1.0,  spike=25.0,  spike_prob=0.04),
    "spo2":               dict(baseline=98.0,  lo=88.0,  hi=100.0, step=0.3,  spike=-5.0,  spike_prob=0.03),
    "blood_pressure_sys": dict(baseline=120.0, lo=90.0,  hi=160.0, step=1.5,  spike=20.0,  spike_prob=0.03),
    "blood_pressure_dia": dict(baseline=80.0,  lo=55.0,  hi=100.0, step=1.0,  spike=15.0,  spike_prob=0.03),
    "temperature":        dict(baseline=36.8,  lo=35.5,  hi=40.0,  step=0.05, spike=1.2,   spike_prob=0.02),
    "ecg_value":          dict(baseline=0.0,   lo=-1.0,  hi=1.0,   step=0.15, spike=0.5,   spike_prob=0.04),
}


class VitalWalker:
    """Maintains state for a single vital sign and advances it one step at a time."""

    def __init__(self, baseline: float, lo: float, hi: float,
                 step: float, spike: float, spike_prob: float) -> None:
        self.value = baseline
        self.lo = lo
        self.hi = hi
        self.step = step
        self.spike = spike
        self.spike_prob = spike_prob

    def next(self) -> float:
        if random.random() < self.spike_prob:
            delta = self.spike * (1 if self.spike >= 0 else -1)
        else:
            delta = random.uniform(-self.step, self.step)

        self.value = max(self.lo, min(self.hi, self.value + delta))
        return round(self.value, 3)


def build_walkers() -> dict:
    return {name: VitalWalker(**cfg) for name, cfg in VITAL_CONFIG.items()}


def parse_args():
    parser = argparse.ArgumentParser(
        description="MedSuite Live Patient Simulator – pushes vital readings every N seconds."
    )
    parser.add_argument(
        "--patient-id", type=int, default=None,
        help="Target patient ID. If omitted, ALL patients are simulated.",
    )
    parser.add_argument("--url", default=os.getenv("MEDSUITE_API_URL", DEFAULT_URL), help="API base URL")
    parser.add_argument(
        "--token",
        default=os.getenv("MEDSUITE_TOKEN", ""),
        help="Bearer JWT token (or set MEDSUITE_TOKEN env var)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=DEFAULT_INTERVAL,
        help="Seconds between readings (default: 0.5)",
    )
    return parser.parse_args()


def auto_login(api_url: str, username: str = "admin", password: str = "admin123") -> str:
    """Attempt to log in with default credentials and return a JWT token."""
    login_url = f"{api_url.rstrip('/')}/auth/login"
    print(f"🔑  Auto-login: POST {login_url}  (user={username})")
    try:
        resp = requests.post(
            login_url,
            data={"username": username, "password": password},
            timeout=5,
        )
        if resp.status_code == 200:
            token = resp.json().get("access_token", "")
            if token:
                print("✅  Auto-login successful.\n")
                return token
        print(f"⚠️  Auto-login failed (HTTP {resp.status_code}): {resp.text[:200]}")
    except Exception as exc:
        print(f"❌  Auto-login error: {exc}")
    return ""


def fetch_all_patient_ids(api_url: str, headers: dict) -> list[int]:
    """Fetch all patient IDs from the API."""
    url = f"{api_url.rstrip('/')}/patients/"
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            patients = resp.json()
            ids = [p["id"] for p in patients if "id" in p]
            return ids
        print(f"⚠️  Failed to fetch patients (HTTP {resp.status_code}): {resp.text[:200]}")
    except Exception as exc:
        print(f"❌  Error fetching patients: {exc}")
    return []


def run(patient_ids: list[int], api_url: str, token: str, interval: float):
    """Run the simulator loop for one or more patients."""
    base = api_url.rstrip("/")
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    print("🏥  MedSuite Live Patient Simulator  [smooth random-walk mode]")
    print(f"    Patients   : {patient_ids}")
    print(f"    Interval   : {interval}s")
    print(f"    Auth token : {'present' if token else 'NOT SET (may fail with 401)'}")
    print("─" * 60)
    print("Press Ctrl+C to stop.\n")

    # Each patient gets its own independent set of walkers
    walkers_per_patient: dict[int, dict] = {pid: build_walkers() for pid in patient_ids}
    reading_count = 0

    try:
        while True:
            for pid in patient_ids:
                try:
                    walkers = walkers_per_patient[pid]
                    vitals = {name: walker.next() for name, walker in walkers.items()}
                    endpoint = f"{base}/vitals/mock/{pid}"
                    resp = requests.post(endpoint, json=vitals, headers=headers, timeout=5)
                    reading_count += 1
                    icon = "✅" if resp.status_code == 201 else "⚠️ "
                    print(
                        f"{icon} [{reading_count:>4}] P{pid:<3} "
                        f"HR={vitals['heart_rate']:>5.1f} bpm  "
                        f"SpO₂={vitals['spo2']:>5.1f}%  "
                        f"Temp={vitals['temperature']:>4.1f}°C  "
                        f"BP={vitals['blood_pressure_sys']:.0f}/{vitals['blood_pressure_dia']:.0f} mmHg  "
                        f"ECG={vitals['ecg_value']:+.3f}  "
                        f"[HTTP {resp.status_code}]"
                    )
                    if resp.status_code not in (200, 201):
                        print(f"    ↳ Response: {resp.text[:200]}")
                except requests.exceptions.ConnectionError:
                    print(f"❌  P{pid} – Could not connect to API. Is the backend running?")
                except requests.exceptions.Timeout:
                    print(f"⏱️  P{pid} – Request timed out.")
                except Exception as exc:  # noqa: BLE001
                    print(f"❌  P{pid} – Unexpected error: {exc}")

            time.sleep(interval)
    except KeyboardInterrupt:
        print(f"\n\n🛑  Simulator stopped after {reading_count} readings across {len(patient_ids)} patient(s).")
        sys.exit(0)


if __name__ == "__main__":
    args = parse_args()
    token = args.token

    if not token:
        print("⚠️  No auth token provided – attempting auto-login with default credentials...\n")
        token = auto_login(args.url)
        if not token:
            print("   Could not auto-login. Set --token or the MEDSUITE_TOKEN environment variable.\n")

    headers = {"Authorization": f"Bearer {token}"} if token else {}

    if args.patient_id:
        # Single patient mode
        target_ids = [args.patient_id]
    else:
        # All-patients mode: fetch from API
        print("📋  No --patient-id specified → fetching all patients from API...\n")
        target_ids = fetch_all_patient_ids(args.url, headers)
        if not target_ids:
            print("❌  No patients found. Create patients first, then re-run the simulator.")
            sys.exit(1)
        print(f"✅  Found {len(target_ids)} patient(s): {target_ids}\n")

    run(
        patient_ids=target_ids,
        api_url=args.url,
        token=token,
        interval=args.interval,
    )
