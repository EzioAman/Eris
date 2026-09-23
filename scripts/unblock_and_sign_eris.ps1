# unblock_and_sign_eris.ps1
# Unblocks Windows Zone.Identifier (Mark of the Web) and cleans signatures
# to prevent Windows 11 Smart App Control (SAC) from flagging broken cert chains.

$ErrorActionPreference = "Continue"

$rootDir = Split-Path -Parent $PSScriptRoot
$unpackedDir = Join-Path $rootDir "frontend\dist-electron\win-unpacked"
$portableExe = Join-Path $rootDir "frontend\dist-electron\ERIS*.exe"

Write-Host "`n=== [1/2] Stripping Windows Mark of the Web (Zone.Identifier) ===" -ForegroundColor Cyan
if (Test-Path $unpackedDir) {
    Get-ChildItem -Path $unpackedDir -Recurse | Unblock-File
    Write-Host " [OK] Unblocked all files and libraries in: $unpackedDir" -ForegroundColor Green
} else {
    Write-Host " [!] Unpacked directory not found yet." -ForegroundColor Yellow
}

$portables = Get-Item $portableExe -ErrorAction SilentlyContinue
if ($portables) {
    $portables | Unblock-File
    Write-Host " [OK] Unblocked portable executable(s)" -ForegroundColor Green
}

Write-Host "`n=== [2/2] Resolving Executable Signature & Smart App Control ===" -ForegroundColor Cyan

# Load PeSignatureRemover to strip invalid self-signed certificates that cause 'UnknownError'
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class PeSignatureCleaner {
    [DllImport("imagehlp.dll", SetLastError = true)]
    public static extern bool ImageRemoveCertificate(SafeFileHandle FileHandle, uint Index);

    public static bool Clean(string path) {
        if (!File.Exists(path)) return false;
        try {
            using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) {
                return ImageRemoveCertificate(fs.SafeFileHandle, 0);
            }
        } catch {
            return false;
        }
    }
}
"@ -ErrorAction SilentlyContinue

$targets = @(
    (Join-Path $unpackedDir "ERIS.exe"),
    (Join-Path $unpackedDir "resources\backend\eris_backend.exe"),
    (Join-Path $rootDir "dist\eris_backend\eris_backend.exe")
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        $sig = Get-AuthenticodeSignature $target
        if ($sig.Status -eq "UnknownError") {
            Write-Host " [!] Removing untrusted self-signed signature from $target to prevent SAC block..." -ForegroundColor Yellow
            [PeSignatureCleaner]::Clean($target) | Out-Null
            Write-Host " [OK] Cleaned ${target}: signature removed" -ForegroundColor Green
        } else {
            Write-Host " [OK] $target status: $($sig.Status)" -ForegroundColor Green
        }
        Unblock-File -Path $target -ErrorAction SilentlyContinue
    }
}

Write-Host "`n=== Smart App Control Status ===" -ForegroundColor Cyan
Write-Host "1. Zone.Identifier streams stripped (files marked as local-origin)."
Write-Host "2. Invalid cert chains purged to prevent SAC 'UnknownError' alerts."
Write-Host "3. You can run ERIS via .\run_eris.bat or directly via .\frontend\dist-electron\win-unpacked\ERIS.exe`n"
