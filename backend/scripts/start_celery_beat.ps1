$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\.."
try {
  .\myenv\Scripts\python.exe -m celery -A app.celery_app.celery_app beat --loglevel=info
} finally {
  Pop-Location
}
