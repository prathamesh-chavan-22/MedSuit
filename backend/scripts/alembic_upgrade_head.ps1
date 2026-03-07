$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\.."
try {
  .\myenv\Scripts\python.exe -m alembic upgrade head
} finally {
  Pop-Location
}
