# dailyuse-ai-skills

Version-controlled, single source of truth for the agent skills I install with
[`npx skills`](https://www.npmjs.com/package/skills) (the [skills.sh](https://skills.sh) CLI).

See [`SKILLS.md`](./SKILLS.md) for the current inventory of skills in this repo.

## How it's wired

`%USERPROFILE%\.agents\skills` is a **Windows junction** that points at this repo:

```
C:\Users\<you>\.agents\skills   ──(junction)──►   C:\Users\<you>\personal\dailyuse-ai-skills
```

`.agents\skills` is the universal skills path that the `skills` CLI installs to and that
GitHub Copilot CLI, Cursor, Codex, Gemini CLI, Cline, etc. load skills from. Because the
junction sits at that exact path, **nothing about how agents discover skills changed** — the
files just physically live in this git repo now, so they can be versioned and committed.

> New to junctions, or want the full picture of how install → commit → load fits together?
> See [`HOW-IT-WORKS.md`](./HOW-IT-WORKS.md).

## Installing a new skill (so it lands here)

**Easiest — use the helper** (installs into this repo through the junction *and* commits):

```powershell
cd $env:USERPROFILE\personal\dailyuse-ai-skills
.\add-skill.ps1 <source> -Skill <skill-name>        # add -Push to also push to a remote
# e.g. .\add-skill.ps1 spillwavesolutions/design-doc-mermaid -Skill design-doc-mermaid
```

**Or manually.** `skills add` (project scope) writes to `<current-dir>\.agents\skills`, so run it
from your **home directory** with `--copy`, and it flows into this repo through the junction:

```powershell
cd $env:USERPROFILE
npx skills add <source> --agent github-copilot --copy --skill <skill-name>
cd $env:USERPROFILE\personal\dailyuse-ai-skills
git add -A && git commit -m "Add <skill-name> skill"
```

### Does it stay in sync automatically?

- **Files: yes, conditionally.** Because `~\.agents\skills` is a junction to this repo, any install
  that targets that path writes the real files *inside this repo* automatically. Two conditions:
  - Run the install **from your home dir** (or just use `add-skill.ps1`, which does that for you) so
    it targets `~\.agents\skills`. Running it from another folder creates a separate `.agents\skills`
    *there* instead, which will **not** land in this repo.
  - Use **`--copy`** so real files — not symlinks — are written into the repo.
- **Git: no.** Git never auto-commits. After an install the new skill appears as uncommitted changes
  (`git status`); you must `git add` + `git commit` (and `git push`) to capture it. `add-skill.ps1`
  does the commit for you.

List / update / remove skills:

```powershell
npx skills list            # what's installed
npx skills update          # update to latest
npx skills remove <name>   # remove a skill
```

## Restoring on a new machine (or after the junction is lost)

1. Clone this repo to `%USERPROFILE%\personal\dailyuse-ai-skills`.
2. Run the helper, which (re)creates the junction at `%USERPROFILE%\.agents\skills`
   pointing back at the clone:

```powershell
powershell -ExecutionPolicy Bypass -File .\recreate-junction.ps1
```

If `%USERPROFILE%\.agents\skills` already exists as a real folder with skills in it, the script
backs it up to `.agents\skills.bak-<timestamp>` before creating the junction.

## Which agents load these skills

| Agent             | Loads from                          |
| ----------------- | ----------------------------------- |
| GitHub Copilot CLI| `~\.agents\skills` (this junction) + `~\.copilot\skills` (its own global path) |
| Cursor / Codex / Gemini CLI / Cline / Zed / Warp | `.agents\skills` (universal path) |

> Note: Claude Code and the `agency` project use `.claude\skills`, a separate path. To share a
> skill there too, install it for that agent (`npx skills add <source> -a claude-code --skill <name>`)
> or copy the skill folder into the relevant `.claude\skills`.
