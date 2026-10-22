#!/usr/bin/env bash
# Publish the built site to the gh-pages branch of the "origin" remote.
# GitHub Pages serves that branch. No GitHub Actions workflow is needed.
#
#   pnpm deploy
#
# Needs push access to origin (SSH key, or a token through GIT_ASKPASS).
set -euo pipefail

cd "$(dirname "$0")/.."
remote="$(git remote get-url origin)"

pnpm build

cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-$(git -C .. config user.name)}" -c user.email="${GIT_AUTHOR_EMAIL:-$(git -C .. config user.email)}" commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -f "$remote" gh-pages
rm -rf .git
echo "Published. Pages updates within a minute or two."
