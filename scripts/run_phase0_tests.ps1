Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Push-Location "D:\MedSuit\backend"
try {
    .\myenv\Scripts\python.exe -m pytest .\tests -q
}
finally {
    Pop-Location
}
