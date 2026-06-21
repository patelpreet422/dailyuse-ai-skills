# How this repo works

A plain-English explanation of the **junction** trick this repo relies on, and the end-to-end
flow from `npx skills add` to a committed, agent-loadable skill.

## TL;DR

The folder agents read skills from (`~\.agents\skills`) is not a real folder — it's a **junction**
that transparently redirects to this git repo. So your skills physically live in version control,
while every agent keeps loading them from the path it already expects. Nothing had to be
reconfigured in any agent.

## What is a junction?

A **junction** (a.k.a. "directory junction") is a built-in Windows NTFS feature: a directory entry
that transparently points to another directory. Any program that opens the junction is silently
served the target folder's contents — it has no idea it's not a normal folder.

- It's the Windows cousin of a Unix **symlink**, but for directories it works **without admin
  rights** (for local drives), which symlinks on Windows normally require.
- There's **no copy** — one set of bytes, two paths to reach them. Edit through either path and you
  edit the same file.
- It's **transparent**: `cd`, file reads/writes, globbing, and skill scanners all behave as if the
  junction were the real directory.

```
A program asks the OS for:                 The OS transparently serves:
C:\Users\you\.agents\skills\foo\SKILL.md   ─►  C:\Users\you\personal\dailyuse-ai-skills\foo\SKILL.md
        (the junction)                              (the real file, in this git repo)
```

## The architecture

```
            you run:  npx skills add <src> --copy        (from your home dir)
                                   │
                                   ▼
        writes skill files to:  ~\.agents\skills\<skill>\
                                   │   (this path is a JUNCTION)
                                   ▼
        real bytes land in:     ~\personal\dailyuse-ai-skills\<skill>\   ◄── this git repo
                                   │
                  ┌────────────────┴───────────────────┐
                  ▼                                     ▼
        you: git add / commit / push          agents load skills from
        (version control)                     ~\.agents\skills  (= the junction = this repo)
                                              GitHub Copilot CLI, Cursor, Codex, Gemini, Cline...
```

So a single folder is simultaneously: the **install target**, the **git repo**, and the
**agent load path** — because the junction makes one physical folder reachable from the path
agents expect.

## End-to-end flow

1. **Install** — `npx skills add <source> --copy` writes the skill into `~\.agents\skills`
   (use `add-skill.ps1`, or run from your home dir so it targets that path).
2. **Redirect** — because that path is a junction, the real files are created inside this repo.
3. **Commit** — `git add` + `git commit` captures the new/updated skill (git never auto-commits).
   `add-skill.ps1` does this step for you.
4. **Load** — agents scan `~\.agents\skills`, follow the junction, and read the skills from the
   repo. (Copilot also has its own global path, `~\.copilot\skills`, for its bundled/user skills.)

## Why a junction (vs. the alternatives)

| Alternative | Why not |
| ----------- | ------- |
| **Copy** the repo into `~\.agents\skills` | Two copies that drift; you'd have to sync them by hand. |
| Make the git repo **directly at** `~\.agents\skills` | Works, but the repo wouldn't live in your `personal` folder, and it mixes the repo with whatever else expects that path. |
| Windows **symlink** | Needs admin / Developer Mode for directories; junctions don't (local drives). |

A junction gives a **single source of truth** (no duplication, no drift), keeps the repo where you
want it (`personal\dailyuse-ai-skills`), and requires zero changes to how agents discover skills.

## Inspect, verify, remove, recreate

```powershell
# Is it a junction, and where does it point?
Get-Item $env:USERPROFILE\.agents\skills | Select-Object LinkType, Target
# LinkType = Junction   Target = C:\Users\<you>\personal\dailyuse-ai-skills

# See what agents see through it
Get-ChildItem $env:USERPROFILE\.agents\skills

# Remove just the link (the repo folder is untouched — a junction is only a pointer)
Remove-Item $env:USERPROFILE\.agents\skills -Force -Recurse

# Recreate it (idempotent; also used on a fresh machine after cloning)
.\recreate-junction.ps1
```

> Deleting a junction with `Remove-Item` removes **only the pointer**, not the target's files.
> (Be careful with tools that "follow" junctions when deleting; the commands above are safe.)

## Good to know / caveats

- **Run installs from your home dir + use `--copy`.** Project scope writes to
  `<cwd>\.agents\skills`; only from `~` does that resolve to the junction. `--copy` ensures real
  files (not a nested symlink) land in the repo. `add-skill.ps1` enforces both.
- **Extra top-level files are harmless.** Through the junction, agents also "see" this repo's
  `README.md`, `*.ps1`, `.gitignore`, etc. Skill loaders only treat **subfolders containing a
  `SKILL.md`** as skills, so these are ignored.
- **`.git` is inside the target.** That's normal and ignored by skill scanners.
- **Portability.** A junction is machine-local. On a new machine, clone the repo and run
  `recreate-junction.ps1` to rebuild the link.
