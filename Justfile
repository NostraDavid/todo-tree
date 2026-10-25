#!/usr/bin/env -S just --justfile

set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments

[group('repository')]
default:
    @just --list --unsorted

# Install exactly the dependencies recorded in package-lock.json.
[group('development')]
sync:
    npm ci

# Install this repository's Git hook without changing global Git configuration.
[group('development')]
hooks:
    git config --local core.hooksPath .git/hooks
    prek install

# Install dependencies and enable the checks that run before each commit.
[group('development')]
setup: sync hooks

# Compile TypeScript after each edit; run watch-bundle in a second terminal.
[group('development')]
watch:
    npm run watch

# Rebuild the development bundle when compiler output changes.
[group('development')]
watch-bundle:
    npm run watch:bundle

[group('quality')]
check: format-check lint type-check test build release-check audit

[group('quality')]
format:
    dprint fmt --config dprint.json --config-discovery=false
    just --fmt --unstable
    nixfmt flake.nix

[group('quality')]
format-check:
    dprint check --config dprint.json --config-discovery=false
    just --fmt --check --unstable
    nixfmt --check flake.nix

[group('quality')]
lint:
    oxlint --deny-warnings src test scripts webpack.config.mts
    statix check flake.nix
    deadnix --fail flake.nix
    actionlint

[group('quality')]
type-check:
    npm run type-check

[group('quality')]
test:
    npm test

[group('quality')]
audit:
    npm audit --audit-level=moderate

[group('build')]
build:
    npm run build

# Validate the version and print its changelog entry as release notes.
[group('release')]
release-check:
    node scripts/release-notes.mts

# Build an installable VSIX without publishing it.
[group('release')]
package: release-check
    npm run package

# Bump both npm manifests without committing, tagging, or publishing.
[group('release')]
version increment="patch":
    npm version --no-git-tag-version "$1"

[group('repository')]
status:
    git status --short --branch

[group('repository')]
diff:
    git diff

# Show commits to help write a short, user-facing changelog entry.
[group('repository')]
changelog baseline="HEAD^" target="HEAD":
    git log --no-merges --format='- %s' "$1..$2"
