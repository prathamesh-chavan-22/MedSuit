#!/usr/bin/env python3
"""
MedSuite Live Patient Simulator
================================
Continuously pushes mock vital-sign readings to a patient every 0.5 seconds,
simulating a live bedside monitor.

Vitals are generated using a *stateful random walk* so successive readings
change smoothly (e.g. HR 72 → 72.3 → 71.8) rather than jumping randomly
across the full physiological range each tick.

Usage:
    python scripts/live_simulator.py --patient-id <ID> [--url <API_BASE_URL>] [--token <JWT>]

Arguments:
    --patient-id  (required)  The numeric ID of the patient to simulate.
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
# Each entry: (baseline, min_clamp, max_clamp, step_size, spike_delta, spike_probability)
# step_size   = maximum change per tick under normal conditions
# spike_delta = magnitude of an occasional anomalous jump (5 % chance)
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
            # Occasional anomalous spike – direction determined by sign of spike config
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
    parser.add_argument("--patient-id", type=int, required=True, help="Target patient ID")
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


def run(patient_id: int, api_url: str, token: str, interval: float):
    endpoint = f"{api_url.rstrip('/')}/vitals/mock/{patient_id}"
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    print("🏥  MedSuite Live Patient Simulator  [smooth random-walk mode]")
    print(f"    Patient ID : {patient_id}")
    print(f"    Endpoint   : {endpoint}")
    print(f"    Interval   : {interval}s")
    print(f"    Auth token : {'present' if token else 'NOT SET (may fail with 401)'}")
    print("─" * 60)
    print("Press Ctrl+C to stop.\n")

    walkers = build_walkers()
    reading_count = 0

    try:
        while True:
            try:
                vitals = {name: walker.next() for name, walker in walkers.items()}
                resp = requests.post(endpoint, json=vitals, headers=headers, timeout=5)
                reading_count += 1
                status_icon = "✅" if resp.status_code == 201 else "⚠️ "
                print(
                    f"{status_icon} [{reading_count:>4}] "
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
                print("❌  Could not connect to API. Is the backend running?")
            except requests.exceptions.Timeout:
                print("⏱️  Request timed out.")
            except Exception as exc:  # noqa: BLE001
                print(f"❌  Unexpected error: {exc}")

            time.sleep(interval)
    except KeyboardInterrupt:
        print(f"\n\n🛑  Simulator stopped after {reading_count} readings.")
        sys.exit(0)


if __name__ == "__main__":
    args = parse_args()
    if not args.token:
        print("⚠️  Warning: no auth token provided. Requests may be rejected with HTTP 401.")
        print("   Set --token or the MEDSUITE_TOKEN environment variable.\n")
    run(
        patient_id=args.patient_id,
        api_url=args.url,
        token=args.token,
        interval=args.interval,
    )
