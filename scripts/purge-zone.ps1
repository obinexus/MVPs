# purge-zone.ps1
# Ritual: Remove Zone.Identifier metadata from all files under ./diram
# Purpose: Restore sovereignty across Windows/WSL boundary

$targetPath = ".\\diram"
$logPath = ".\\zone-purge.log"

function Purge-ZoneIdentifier {
    param([string]$path)

    Get-ChildItem -Path $path -Recurse -File | ForEach-Object {
        $stream = "$($_.FullName):Zone.Identifier"
        if (Test-Path $stream) {
            try {
                Remove-Item -Path $stream -Force
                Add-Content -Path $logPath -Value "? Purged: $stream"
            } catch {
                Add-Content -Path $logPath -Value "?? Failed: $stream - $_"
            }
        }
    }
}

# Ritual begins
Add-Content -Path $logPath -Value "`n?? Zone Purge Initiated: $(Get-Date)"
Purge-ZoneIdentifier -path $targetPath
Add-Content -Path $logPath -Value "?? Zone Purge Complete: $(Get-Date)"

