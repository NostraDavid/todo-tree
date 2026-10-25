# Changelog

This file records changes to Todo Tree by NostraDavid.
We publish small releases when a useful change is ready. Versions follow semantic versioning.
The original Todo Tree release history is preserved in [the upstream changelog](docs/upstream-CHANGELOG.md).

## [Unreleased]

### Added

- Publish the existing GitHub release VSIX to Marketplace automatically, with version checks and a manual retry for existing tags.
- Verify public Marketplace availability after publication and report missing publishing access explicitly.

### Changed

- Ignore root files by default and allow only the project files and directories, following the nixcfg and CTB convention.
- Include the repository-local prek configuration so fresh clones can install their commit checks.
- Clarify the Azure subscription requirement for new DevOps organizations and the manual Marketplace upload alternative.
- Upgrade the VSIX tool to 4.0.0 and document the publishing credential setup and required migration before global PAT retirement.

## [1.0.0] - 2026-10-25

### Added

- Expand a leading `~` in `todo-tree.ripgrep.ripgrep` to the current user's home directory. A setting such as `~/.local/bin/rg` can now be shared across machines with different usernames and home directories.
- Add an installation tutorial, a first-contribution guide, and a procedure for frequent small releases.
- Add a locked Nix development shell, a grouped Justfile, dprint formatting, Oxlint, and prek commit checks.
- Add Linux, macOS, and Windows CI checks, plus a tagged GitHub release workflow that attaches the VSIX and this version's notes.
- Check that the package, lockfile, changelog, and release tag agree before a release.

### Changed

- Establish the NostraDavid fork at version **1.0.0**, separate from the original project's **0.0.x** versions.
- Use publisher `nostradavid`, package name `nostradavid-todo-tree`, and display name **Todo Tree by NostraDavid**.
- Keep existing `todo-tree.*` settings and commands so existing configurations can move to the fork.
- Upgrade the build to webpack 5 and use Node.js 24 for development. The extension still targets VS Code 1.72 and later.
- Build from the committed codicon list instead of downloading a changing list during packaging.
- Restrict the VSIX to the runtime bundle, assets, license, and user documentation.
- Update locked npm dependencies and pin the packaging tool's Azure Identity dependency to avoid a known authentication advisory.

### Fixed

- Let the stop command signal the active ripgrep process. A local variable previously hid that process from the cancellation function.

### Migration

- Disable or uninstall `Gruntfuggly.todo-tree`, then install `nostradavid.nostradavid-todo-tree`.
- Keep the original MIT license and Nigel Scott's copyright notice with the distribution.

[Unreleased]: https://github.com/NostraDavid/todo-tree/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/NostraDavid/todo-tree/releases/tag/v1.0.0
