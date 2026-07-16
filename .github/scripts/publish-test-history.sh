#!/usr/bin/env bash
set -euo pipefail

# Persists reports/history.json (and the dashboard rendered from it) across
# CI runs by publishing them to a dedicated `test-history` branch, instead
# of committing them to `main`.
#
# Why a separate branch rather than committing straight to `main` (the
# other option the team considered)?
#   1. This workflow triggers on `push: branches: [main]` (see
#      playwright.yml). A bot commit landing on `main` would immediately
#      re-trigger the very workflow that produced it — a second full e2e
#      run against opencart.com's already-documented Cloudflare rate
#      limiting, to publish a commit that only ever touches a JSON/HTML
#      file. Pushing to `test-history` instead triggers nothing.
#   2. `main` here only changes via reviewed PRs; a bot commit recording
#      run stats doesn't belong mixed into that history, and would need
#      `contents: write` + a bypass of any branch-protection review
#      requirement on `main` to land at all — a policy change that isn't
#      this script's call to make (see README/CI section).
# `test-history` is an orphan branch (no shared commit history with `main`)
# because it holds generated data, not code — there's nothing to merge or
# diff against `main` for.
#
# Requires `contents: write` permission on the calling job (scoped there,
# not workflow-wide — see playwright.yml) and `actions/checkout` having run
# with enough history/credentials to fetch and push another branch.
#
# Usage: publish-test-history.sh [resultsPath]

BRANCH="test-history"
RESULTS_PATH="${1:-reports/results.json}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
WORKTREE_DIR="$(mktemp -d)"

cleanup() {
  git -C "$REPO_ROOT" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  rm -rf "$WORKTREE_DIR"
}
trap cleanup EXIT

cd "$REPO_ROOT"

git fetch origin "$BRANCH" >/dev/null 2>&1 || true

if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH"; then
  git worktree add "$WORKTREE_DIR" "$BRANCH"
else
  # First run ever: the branch doesn't exist on the remote yet. Create it as
  # an orphan in its own worktree rather than switching the main checkout's
  # branch (which would disturb the job's other steps still relying on
  # `main`'s checked-out files, e.g. reports/results.json below).
  echo "test-history branch not found on origin — creating it as a new orphan branch."
  git worktree add --detach "$WORKTREE_DIR" HEAD
  (cd "$WORKTREE_DIR" && git checkout --orphan "$BRANCH" && git rm -rf . >/dev/null 2>&1 || true)
fi

node "$REPO_ROOT/.github/scripts/append-test-history.js" "$RESULTS_PATH" "$WORKTREE_DIR/history.json"
node "$REPO_ROOT/.github/scripts/generate-dashboard.js" "$WORKTREE_DIR/history.json" "$WORKTREE_DIR/dashboard.html"

cd "$WORKTREE_DIR"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add history.json dashboard.html

if git diff --cached --quiet; then
  echo "No history change to publish."
  exit 0
fi

git commit -q -m "Update test history (${GITHUB_SHA:-local run})"
git push origin "HEAD:$BRANCH"
echo "Published updated history.json and dashboard.html to the $BRANCH branch."
