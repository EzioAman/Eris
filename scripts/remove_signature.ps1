# scripts/remove_signature.ps1
# Cleanly strips invalid self-signed Authenticode signatures using ImageRemoveCertificate from imagehlp.dll

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$resolved = Resolve-Path $FilePath
$fullPath = $resolved.Path

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public class PeSignatureRemover {
    [DllImport("imagehlp.dll", SetLastError = true)]
    public static extern bool ImageRemoveCertificate(SafeFileHandle FileHandle, uint Index);

    public static bool RemoveCert(string path) {
        using (FileStream fs = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) {
            return ImageRemoveCertificate(fs.SafeFileHandle, 0);
        }
    }
}
"@ -ErrorAction SilentlyContinue

try {
    $res = [PeSignatureRemover]::RemoveCert($fullPath)
    Write-Host "ImageRemoveCertificate result for $fullPath : $res"
} catch {
    Write-Host "Error stripping signature: $_"
}
