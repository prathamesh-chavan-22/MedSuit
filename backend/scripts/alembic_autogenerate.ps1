$ErrorActionPreference = "Stop"

param(
  [string]$Message = "auto_migration"
)

Push-Location "$PSScriptRoot\.."
try {
  .\myenv\Scripts\python.exe -m alembic revision --autogenerate -m $Message
} finally {
  Pop-Location
}
