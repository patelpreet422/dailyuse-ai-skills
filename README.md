# dailyuse-ai-skills

A portable **list** of the agent skills I install with
[`npx skills`](https://www.npmjs.com/package/skills) (the [skills.sh](https://skills.sh) CLI),
plus a thin wrapper that installs / updates / removes the whole set on any machine.

This repo does **not** vendor skill files — it only records *which skills to install and from
where*. `npx skills` does the actual downloading. My own authored skills live in a separate
source repo (e.g. `patelpreet422/skills`), which is just another entry in the list.

## The list: `skills.json`

`skills.json` maps each **source** to the **skill names** to install from it — the minimum
`npx skills` needs to (re)install them:

```json
{
  "anthropics/skills": ["frontend-design", "skill-creator"],
  "mattpocock/skills": ["grill-me", "to-prd"],
  "vercel-labs/skills": ["find-skills"]
}
```

A *source* is anything `npx skills add` accepts: `owner/repo`, a Git URL, or a local path —
including my own `patelpreet422/skills`.

## Set up on a new machine

```sh
git clone https://github.com/patelpreet422/dailyuse-ai-skills
cd dailyuse-ai-skills
npm run sync          # or: node scripts/manage.mjs sync
```

`sync` installs every skill in `skills.json` (latest) **globally** into `~/.agents/skills` —
the universal path that GitHub Copilot CLI, Cursor, Gemini CLI, Cline, Warp, etc. read — so
they load in every session. No symlinks, no build step.

## Run it from anywhere (optional global command)

`npm link` from the clone puts a `dailyuse-skills` command on your PATH that stays wired to
*this* clone — it reads/writes this `skills.json` and commits/pushes this repo, from any
directory:

```sh
cd dailyuse-ai-skills
npm link                                   # one time; creates the global `dailyuse-skills`
# then, from anywhere on the machine:
dailyuse-skills add anthropics/skills skill-creator --push
dailyuse-skills list
```

Use `npm link`, **not** `npm install -g .` — link *symlinks* the command to the clone (so your
edits land in the git repo), whereas a global install copies the files and disconnects them
from git. Undo with `npm unlink -g dailyuse-ai-skills`.

## Day-to-day

```sh
npm run add -- anthropics/skills skill-creator   # install + add to skills.json
npm run remove -- skill-creator                  # uninstall + remove from skills.json
npm run save -- "message"                        # commit skills.json + push
npm run list                                     # show the tracked set
npm run update                                   # update installed skills (npx skills update -g)
npm run sync                                     # re-install the whole set (latest)
```

`add` / `remove` keep `skills.json` in step with what's installed. Pass **`--push`** to also
commit `skills.json` and push in one go (or run `save` afterwards). With the linked global
command:

```sh
dailyuse-skills add anthropics/skills skill-creator --push   # install + record + commit + push
dailyuse-skills remove skill-creator --push
dailyuse-skills save "tidy up"                               # just commit skills.json + push
```

`--push` / `save` stage **only** `skills.json` and `git push` from this clone, so they use this
repo's own remote and credentials (see below) — nothing global, and other working changes are
left untouched.

Any command the wrapper doesn't manage is passed **straight through to `npx skills`**, so the
full CLI stays available:

```sh
node scripts/manage.mjs find react       # -> npx skills find react
node scripts/manage.mjs use vercel-labs/agent-skills@web-design-guidelines
node scripts/manage.mjs list -g          # -> npx skills list -g  (installed, not the tracked set)
```

## Pushing with this repo's own credentials

`--push` / `save` run `git push` inside this clone, so they use whatever remote and auth the
clone is configured with. To give this repo its **own** push credentials, independent of your
global git setup:

**SSH + a repo-local deploy key (recommended):**

```sh
git remote set-url origin git@github.com:patelpreet422/dailyuse-ai-skills.git
git config core.sshCommand "ssh -i ~/.ssh/dailyuse_ed25519 -o IdentitiesOnly=yes"
```

Add `~/.ssh/dailyuse_ed25519.pub` as a deploy key (with write access) on the GitHub repo.
`core.sshCommand` is repo-local, so only this repo uses that key.

**HTTPS + a token (simpler):** embed a fine-grained PAT in the remote URL — it lives only in
this repo's `.git/config`:

```sh
git remote set-url origin https://<TOKEN>@github.com/patelpreet422/dailyuse-ai-skills.git
```

Optionally pin a repo-local commit identity too:
`git config user.name "..."` and `git config user.email "..."`.

## My own skills

Author them in a separate repo (e.g. `patelpreet422/skills`) laid out the way `npx skills`
expects — one folder per skill under `skills/`:

```
skills/<skill-name>/SKILL.md
```

Then add them to the set like any other source:

```sh
npm run add -- patelpreet422/skills my-skill
```

## Notes

- **No symlinks, no vendored skill files.** The repo is just `skills.json` + the wrapper;
  skill *content* is downloaded by `npx skills` into `~/.agents/skills`.
- **Concurrency-safe.** `skills.json` is written atomically (temp file + rename) and every
  read-modify-write is guarded by a lock, so simultaneous `add` / `remove` runs can't corrupt
  it or lose an update.
- **Root-`SKILL.md` repos don't fully install.** `npx skills` only copies the root `SKILL.md`
  from a repo whose `SKILL.md` sits at the repo root (e.g. `spillwavesolutions/design-doc-mermaid`),
  dropping its `scripts/`, `assets/`, etc. Host such skills as a **subfolder**
  (`skills/<name>/SKILL.md`) in your own repo so the whole folder installs.
