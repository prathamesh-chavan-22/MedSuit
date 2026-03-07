$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\.."
try {
  .\myenv\Scripts\python.exe -m celery -A app.celery_app.celery_app flower --port=5555
} finally {
  Pop-Location
}
