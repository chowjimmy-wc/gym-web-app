# Run this on a machine WITH internet, then copy the whole GymApp folder to your offline PC.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$wheels = Join-Path $root "wheels"

New-Item -ItemType Directory -Force -Path $wheels | Out-Null
python -m pip download -r (Join-Path $root "requirements.txt") -d $wheels
Write-Host "Wheels saved to $wheels"
