#requires -Version 5.1
<#
.SYNOPSIS
    (Re)creates the Windows junction  %USERPROFILE%\.agents\skills  ->  this repo,
    so agents (GitHub Copilot CLI, Cursor, Codex, Gemini, Cline, ...) load the
    version-controlled skills stored here.

.DESCRIPTION
    Run after cloning this repo on a new machine, or any time the junction is lost.
    Safe to run repeatedly. If the link path already exists as a REAL folder with
    content, it is backed up before the junction is created.
#>

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot                      # this repo = junction target
$linkPath = Join-Path $env:USERPROFILE '.agents\skills'

Write-Host "Repo (target): $repoRoot"
Write-Host "Junction path: $linkPath"

# Ensure parent (~\.agents) exists
$parent = Split-Path $linkPath -Parent
if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

if (Test-Path $linkPath) {
    $item = Get-Item $linkPath -Force
    if ($item.LinkType -eq 'Junction' -or $item.LinkType -eq 'SymbolicLink') {
        Write-Host "Existing link found -> removing it." -ForegroundColor Yellow
        Remove-Item -LiteralPath $linkPath -Force -Recurse
    }
    else {
        $children = Get-ChildItem $linkPath -Force
        if ($children) {
            $bak = "$linkPath.bak-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss')
            Write-Host "Real folder with content found -> backing up to: $bak" -ForegroundColor Yellow
            Move-Item -LiteralPath $linkPath -Destination $bak -Force
        }
        else {
            Remove-Item -LiteralPath $linkPath -Force -Recurse
        }
    }
}

New-Item -ItemType Junction -Path $linkPath -Target $repoRoot | Out-Null

$created = Get-Item $linkPath -Force
Write-Host ""
Write-Host "Done. $linkPath  [$($created.LinkType)]  ->  $($created.Target -join ', ')" -ForegroundColor Green
Write-Host "Skills now visible through the junction:"
Get-ChildItem $linkPath | Select-Object -ExpandProperty Name | ForEach-Object { Write-Host "  - $_" }
