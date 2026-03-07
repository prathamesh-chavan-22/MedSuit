"""Run Phase 0 backend security tests.

Usage:
    python scripts/run_phase0_tests.py
"""

from pathlib import Path
import subprocess
import sys


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    backend = root / "backend"
    tests = backend / "tests"
    venv_python = backend / "myenv" / "Scripts" / "python.exe"
    python_bin = str(venv_python) if venv_python.exists() else sys.executable

    cmd = [python_bin, "-m", "pytest", str(tests), "-q"]
    print("Running:", " ".join(cmd))
    result = subprocess.run(cmd, cwd=str(backend), check=False)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
