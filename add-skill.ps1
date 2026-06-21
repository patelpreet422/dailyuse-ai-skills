#requires -Version 5.1
<#
.SYNOPSIS
    Install a skill with `npx skills` straight into this version-controlled repo, then commit it.

.DESCRIPTION
    Runs `npx skills add` from your home directory, targeting the GitHub Copilot agent with --copy,
    so the skill is written to  ~\.agents\skills  (a junction to this repo). It then stages and
    commits the change so the repo stays in sync. Optionally pushes.

    Requires the junction to exist (run .\recreate-junction.ps1 once on a new machine).

.PARAMETER Source
    Skill source understood by `npx skills` (owner/repo, full GitHub/GitLab URL, git URL, or path).

.PARAMETER Skill
    One or more specific skill names to install from the source.

.PARAMETER NoCommit
    Install only; don't stage/commit.

.PARAMETER Push
    Run `git push` after committing.

.EXAMPLE
    .\add-skill.ps1 spillwavesolutions/design-doc-mermaid -Skill design-doc-mermaid

.EXAMPLE
    .\add-skill.ps1 vercel-labs/agent-skills -Skill frontend-design -Push
#>
param(
    [Parameter(Mandatory, Position = 0)][string]$Source,
    [string[]]$Skill,
    [switch]$NoCommit,
    [switch]$Push
)

$ErrorActionPreference = 'Stop'
$repo = $PSScriptRoot

# npx --yes : auto-install the `skills` package if needed.
# skills add ... --agent github-copilot --copy --yes : write real files to the .agents/skills path,
# non-interactively. Run from $HOME so project scope resolves to ~\.agents\skills (== this repo).
$npxArgs = @('--yes', 'skills', 'add', $Source, '--agent', 'github-copilot', '--copy', '--yes')
foreach ($s in $Skill) { $npxArgs += @('--skill', $s) }

Write-Host "npx $($npxArgs -join ' ')   (cwd: $env:USERPROFILE)" -ForegroundColor Cyan
Push-Location $env:USERPROFILE
try { npx @npxArgs } finally { Pop-Location }

if ($NoCommit) { Write-Host 'Installed. Skipped commit (-NoCommit).' -ForegroundColor Yellow; return }

if (-not (git -C $repo status --porcelain)) {
    Write-Host 'No repo changes detected (nothing to commit).' -ForegroundColor Yellow
    return
}

git -C $repo add -A
$msg = if ($Skill) { "Add/update skill(s): $($Skill -join ', ') (from $Source)" }
       else        { "Add/update skills from $Source" }
git -C $repo commit -m $msg | Out-Null
Write-Host "Committed: $msg" -ForegroundColor Green
git -C $repo --no-pager log --oneline -1

if ($Push) {
    git -C $repo push
    Write-Host 'Pushed.' -ForegroundColor Green
}
