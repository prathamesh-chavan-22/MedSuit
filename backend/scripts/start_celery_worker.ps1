$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\.."
try {
  .\myenv\Scripts\python.exe -m celery -A app.celery_app.celery_app worker --loglevel=info --pool=threads --concurrency=8 -Q audio,default,maintenance
} finally {
  Pop-Location
}
