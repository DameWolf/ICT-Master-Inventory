#!/usr/bin/env node
/**
 * auto-commit.mjs
 * ───────────────────────────────────────────────────────────
 * Watches the repository for file changes and automatically
 * commits + pushes to GitHub after a quiet period (debounce).
 *
 * Usage:  npm run auto-commit
 * ───────────────────────────────────────────────────────────
 */

import chokidar from "chokidar";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────
const WATCH_PATHS = ["."];
const IGNORE = [
  /node_modules/,
  /\.git/,
  /dist/,
  /dist-ssr/,
  /logs/,
  /\.DS_Store/,
  /debug-browser\.js/,
  /debug-playwright\.mjs/,
  /debug\.spec\.js/,
  /\.env$/,
  /\.env\./,
];
const DEBOUNCE_MS = 5_000;
const MAX_CHANGED_FILES_IN_MESSAGE = 5;
const BRANCH = (() => {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: __dirname, encoding: "utf8" }).trim() || "main";
  } catch {
    return "main";
  }
})();
// ────────────────────────────────────────────────────────────

let debounceTimer = null;
const changedFiles = new Set();
let committing = false;

const colors = {
  reset:  "\x1b[0m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  red:    "\x1b[31m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
};

function log(symbol, color, msg) {
  const ts = new Date().toLocaleTimeString("en-PH", { hour12: false });
  console.log(`${colors.dim}[${ts}]${colors.reset} ${color}${symbol}${colors.reset} ${msg}`);
}

function run(cmd) {
  return execSync(cmd, { cwd: __dirname, encoding: "utf8" }).trim();
}

function hasUncommittedChanges() {
  const status = run("git status --porcelain");
  return status.length > 0;
}

function hasRemoteOrigin() {
  try {
    return Boolean(run("git remote get-url origin"));
  } catch {
    return false;
  }
}

function isIgnoredPath(filePath) {
  return IGNORE.some((pattern) => pattern.test(filePath));
}

function autoCommit() {
  if (committing) return;
  committing = true;

  if (!hasUncommittedChanges()) {
    log("✓", colors.dim, "No changes to commit.");
    changedFiles.clear();
    committing = false;
    return;
  }

  const fileList = [...changedFiles].slice(0, MAX_CHANGED_FILES_IN_MESSAGE).join(", ");
  const extra = changedFiles.size > MAX_CHANGED_FILES_IN_MESSAGE ? ` +${changedFiles.size - MAX_CHANGED_FILES_IN_MESSAGE} more` : "";
  const now = new Date().toLocaleString("en-PH", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const message = `auto: save ${now} — ${fileList}${extra}`;

  try {
    run("git add -A");
    run(`git commit -m "${message}"`);
    log("📦", colors.green, `Committed: ${colors.bold}${message}${colors.reset}`);

    if (hasRemoteOrigin()) {
      log("🚀", colors.cyan, `Pushing to origin/${BRANCH}…`);
      try {
        run(`git push origin ${BRANCH}`);
        log("✅", colors.green, `${colors.bold}Pushed successfully!${colors.reset}`);
      } catch (pushErr) {
        log("⚠️", colors.yellow, `Push skipped or failed: ${pushErr.message}`);
        log("ℹ️", colors.dim, "You can run: git push origin " + BRANCH);
      }
    } else {
      log("⚠️", colors.yellow, "No git remote named 'origin'. Commit created locally only.");
    }
  } catch (err) {
    log("❌", colors.red, `Git error: ${err.message}`);
  } finally {
    committing = false;
  }

  changedFiles.clear();
}

function scheduleCommit(filePath) {
  const rel = path.relative(__dirname, filePath);
  if (!rel || isIgnoredPath(rel)) return;

  changedFiles.add(rel);
  log("📝", colors.yellow, `Changed: ${rel} — committing in ${DEBOUNCE_MS / 1000}s…`);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(autoCommit, DEBOUNCE_MS);
}

// ── Start watcher ────────────────────────────────────────────
console.log(`\n${colors.bold}${colors.cyan}━━━  ICT Inventory Auto-Commit Watcher  ━━━${colors.reset}`);
console.log(`${colors.dim}Watching: ${WATCH_PATHS.join(", ")}`);
console.log(`Debounce: ${DEBOUNCE_MS / 1000}s after last change`);
console.log(`Branch  : ${BRANCH}${colors.reset}\n`);
if (!hasRemoteOrigin()) {
  log("⚠️", colors.yellow, "No origin remote detected. Push step will be skipped.");
}

const watcher = chokidar.watch(WATCH_PATHS, {
  cwd: __dirname,
  ignored: (watchedPath) => isIgnoredPath(watchedPath),
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
});

watcher
  .on("add",    (p) => scheduleCommit(path.join(__dirname, p)))
  .on("change", (p) => scheduleCommit(path.join(__dirname, p)))
  .on("unlink", (p) => scheduleCommit(path.join(__dirname, p)))
  .on("error",  (err) => log("❌", colors.red, `Watcher error: ${err}`))
  .on("ready",  () => log("👁️ ", colors.green, "Watching for changes… (Ctrl+C to stop)\n"));

process.on("SIGINT", () => {
  console.log(`\n${colors.yellow}Watcher stopped.${colors.reset}`);
  process.exit(0);
});
