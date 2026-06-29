#!/usr/bin/env node
// Thin wrapper over `npx skills`. Keeps skills.json (a simple "source -> [skill names]"
// list) in step with what's installed, and delegates the real install/remove/update work
// to the skills CLI. skills.json tracks just enough for `npx skills` to re-install: the
// source and the skill name.
//
// Commands it manages: sync, add, remove (these maintain skills.json).
// Any other command (list, update, find, use, init, experimental_install, ...) is passed
// straight through to `npx skills`, so the full CLI stays available.
//
// Concurrency-safe: skills.json is written atomically (temp file + rename) and every
// read-modify-write is guarded by a lock, so simultaneous invocations can't corrupt it or
// lose an update.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIST = join(repoRoot, "skills.json");
const LOCK_DIR = `${LIST}.lock`;
const LOCK_TIMEOUT_MS = 15000; // give up acquiring after this long
const LOCK_STALE_MS = 60000; // treat a lock older than this as abandoned

// Install target: the universal global skills dir (~/.agents/skills), which GitHub Copilot
// CLI, Cursor, Gemini CLI, Cline, Warp, etc. all read, so skills load in every session.
const ADD_SCOPE = ["--global", "--agent", "universal", "--copy", "--yes"];
// Remove from every global agent dir (the CLI's `--agent universal` filter doesn't match
// on removal, so we let it target all agents — the skill should be gone everywhere anyway).
const REMOVE_SCOPE = ["--global", "--yes"];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Run a function while holding an exclusive lock on skills.json. mkdir is atomic on every
// platform, so it doubles as a mutex. A stale lock (crashed run) is reclaimed after a while.
function withLock(fn) {
  const start = Date.now();
  for (;;) {
    try {
      mkdirSync(LOCK_DIR);
      break;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        if (Date.now() - statSync(LOCK_DIR).mtimeMs > LOCK_STALE_MS) {
          rmSync(LOCK_DIR, { recursive: true, force: true });
          continue;
        }
      } catch {
        // lock vanished between the failed mkdir and the stat — just retry.
      }
      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        console.error("Could not acquire a lock on skills.json (another instance running?). Try again.");
        process.exit(1);
      }
      sleep(50 + Math.floor(Math.random() * 100));
    }
  }
  try {
    return fn();
  } finally {
    try {
      rmSync(LOCK_DIR, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

function readList() {
  if (!existsSync(LIST)) return {};
  try {
    return JSON.parse(readFileSync(LIST, "utf8"));
  } catch (err) {
    console.error(`skills.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}

function writeListAtomic(list) {
  const sorted = {};
  for (const src of Object.keys(list).sort()) {
    const items = [...new Set(list[src])].sort();
    if (items.length) sorted[src] = items;
  }
  const tmp = `${LIST}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(sorted, null, 2)}\n`);
  renameSync(tmp, LIST); // atomic replace — readers see old or new, never a partial file
}

// Read the latest list, apply a change, and write it back — all under the lock.
function mutateList(mutator) {
  withLock(() => {
    const list = readList();
    mutator(list);
    writeListAtomic(list);
  });
}

function skills(args) {
  const isWin = process.platform === "win32";
  const cmd = isWin ? "npx.cmd" : "npx";
  // On Windows, spawning a .cmd shim requires shell:true (Node's CVE-2024-27980 fix
  // rejects .cmd/.bat otherwise with EINVAL).
  const r = spawnSync(cmd, ["--yes", "skills", ...args], { stdio: "inherit", shell: isWin });
  if (r.error) {
    console.error(`Failed to run npx skills: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function git(args) {
  const r = spawnSync("git", ["-C", repoRoot, ...args], { stdio: "inherit" });
  if (r.error) {
    console.error(`Failed to run git: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function gitOut(args) {
  const r = spawnSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" });
  return (r.stdout || "").trim();
}

// Stage skills.json, commit it (when changed) and push to THIS repo's own remote, using
// whatever git credentials this clone is configured with (e.g. a repo-local core.sshCommand
// or a credential helper). Only skills.json is staged, so other working changes are untouched.
function commitAndPush(message) {
  git(["add", "skills.json"]);
  if (gitOut(["status", "--porcelain", "skills.json"])) {
    git(["commit", "-m", message]);
  } else {
    console.log("skills.json unchanged — nothing to commit.");
  }
  git(["push"]);
}

function printHelp() {
  console.log(`dailyuse-ai-skills — manage the set of skills installed via npx skills.

Usage:  node scripts/manage.mjs <command> [args]   (or: npm run <command> -- [args])

Managed commands (these keep skills.json in sync):
  sync                     Install every skill in skills.json (latest), globally
  add <source> <skill...>  Install skill(s) now + add them to skills.json   [--push]
  remove <skill...>        Uninstall skill(s) + remove them from skills.json [--push]
  save [message]           Commit skills.json + push to this repo's remote
  list                     Show the tracked skills (bare). With args -> npx skills list ...

  --push  on add/remove also commits skills.json and pushes, using this clone's git creds.

Anything else is passed straight to npx skills, e.g.:
  update [skill...]        npx skills update -g
  find <query> | use ... | init ... | experimental_install ...

skills.json maps each source (e.g. anthropics/skills) to the skills installed from it.
Your own skills repo (e.g. patelpreet422/skills) is just another source.`);
}

const [cmd, ...args] = process.argv.slice(2);

if (!cmd || cmd === "help" || cmd === "-h" || cmd === "--help") {
  printHelp();
  process.exit(0);
}

switch (cmd) {
  case "sync": {
    const list = readList(); // read-only; sync never writes skills.json
    const sources = Object.keys(list);
    if (!sources.length) {
      console.log("skills.json is empty — nothing to sync.");
      break;
    }
    for (const src of sources) {
      const skillArgs = list[src].flatMap((s) => ["--skill", s]);
      skills(["add", src, ...skillArgs, ...ADD_SCOPE]);
    }
    const total = sources.reduce((n, s) => n + list[s].length, 0);
    console.log(`\nSynced ${total} skill(s) from ${sources.length} source(s).`);
    break;
  }

  case "add": {
    // Pass list-only queries straight through (nothing gets installed or recorded).
    if (args.includes("-l") || args.includes("--list")) {
      skills(["add", ...args]);
      break;
    }
    const positionals = args.filter((a) => !a.startsWith("-"));
    const flagged = [];
    for (let i = 0; i < args.length; i++) {
      if ((args[i] === "--skill" || args[i] === "-s") && args[i + 1]) flagged.push(args[i + 1]);
    }
    const source = positionals[0];
    const names = [...new Set(positionals.slice(1).concat(flagged))];
    if (!source || !names.length) {
      console.error("usage: add <source> <skill> [skill...]   e.g. add anthropics/skills skill-creator");
      process.exit(1);
    }
    skills(["add", source, ...names.flatMap((s) => ["--skill", s]), ...ADD_SCOPE]);
    mutateList((list) => {
      list[source] = [...(list[source] || []), ...names];
    });
    console.log(`\nAdded to skills.json: ${names.join(", ")} (from ${source}).`);
    if (args.includes("--push")) commitAndPush(`skills: add ${names.join(", ")}`);
    else console.log("Tip: re-run with --push to also commit + push skills.json.");
    break;
  }

  case "remove":
  case "rm": {
    const names = args.filter((a) => !a.startsWith("-"));
    if (!names.length) {
      console.error("usage: remove <skill> [skill...]");
      process.exit(1);
    }
    skills(["remove", ...names, ...REMOVE_SCOPE]);
    mutateList((list) => {
      for (const name of names) {
        for (const src of Object.keys(list)) {
          list[src] = list[src].filter((s) => s !== name);
          if (!list[src].length) delete list[src];
        }
      }
    });
    console.log(`\nRemoved from skills.json: ${names.join(", ")}.`);
    if (args.includes("--push")) commitAndPush(`skills: remove ${names.join(", ")}`);
    else console.log("Tip: re-run with --push to also commit + push skills.json.");
    break;
  }

  case "list":
  case "ls": {
    if (args.length) {
      skills([cmd, ...args]); // e.g. `list -g` -> npx skills list -g
      break;
    }
    const list = readList();
    const total = Object.values(list).reduce((n, a) => n + a.length, 0);
    console.log(`${total} skill(s) tracked in skills.json:`);
    for (const src of Object.keys(list).sort()) {
      for (const s of list[src]) console.log(`  ${s.padEnd(24)} ${src}`);
    }
    break;
  }

  case "save": {
    const message = args.filter((a) => !a.startsWith("-")).join(" ") || "skills: update skills.json";
    commitAndPush(message);
    break;
  }

  default:
    // Everything else is a normal npx skills command — forward it unchanged.
    skills([cmd, ...args]);
}
