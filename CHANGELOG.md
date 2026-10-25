# Changelog

This file records changes to Todo Tree by NostraDavid.
We publish small releases when a useful change is ready. Versions follow semantic versioning.
The original Todo Tree release history is preserved in [the upstream changelog](docs/upstream-CHANGELOG.md).

## [Unreleased]

## [1.0.9] - 2026-10-25

### Fixed

- Keep the tree-view context action inside Todo Tree when tags-only mode is active, instead of showing it in other extensions.

## [1.0.8] - 2026-10-25

### Fixed

- Show tag-group counts in tag and current-file status labels without duplicating groups that are also tags. Preserve top-three ordering and zero-result labels.
- Adapt upstream PR [#916](https://github.com/Gruntfuggly/todo-tree/pull/916) by Abrifq.

## [1.0.7] - 2026-10-25

### Fixed

- Reject invalid filter regexes with a readable message while preserving the current tree and saved filter.
- Keep the filter when cancelling input, clear it on an empty value, and recover from an invalid saved filter at startup.

## [1.0.6] - 2026-10-25

### Fixed

- Keep default TODO matches on their own line, including HTML comments and CRLF files.
- Require a literal dot and whitespace in numbered Markdown lists; preserve checkbox tags and explicit multiline patterns.
- Adapt the default-regex ideas from upstream PRs [#913](https://github.com/Gruntfuggly/todo-tree/pull/913) by quidscio and [#639](https://github.com/Gruntfuggly/todo-tree/pull/639) by baincd.

## [1.0.5] - 2026-10-25

### Fixed

- Launch ripgrep directly with argument arrays, preserving executable/filename spaces, parentheses, quotes and dollar signs.
- Parse quoted custom arguments and simple environment references without executing shell operators.
- Give every search its own temporary pattern file and clean it after success, errors or cancellation.
- Distinguish no matches from process failures and output-buffer errors; stop all active and queued searches when cancelled.
- Bundle runtime dependency license texts and original packaged license declarations in the VSIX.

## [1.0.4] - 2026-10-25

### Fixed

- Respect the declared file-excludes mode as well as the combined and search-only modes.
- Cover all four built-in exclude settings with regression tests.

## [1.0.3] - 2026-10-25

### Fixed

- Preserve other files when refreshing grouped results in tree, flat and tags-only views. Based on upstream PR #832 by baincd.
- Removing the first member of a shared tag group no longer deletes results from its other members.
- Correct the grouping setting names in the README.

## [1.0.2] - 2026-10-25

### Fixed

- Stop modifying the shared RegExp prototype; preserve native match indices for other extensions.
- Use native indices on editor-search expressions so capture-group highlights retain their ranges.

## [1.0.1] - 2026-10-25

### Fixed

- Find current VS Code bundled ripgrep on Linux, macOS and Windows, including ARM64 and unpacked installations. Based on upstream PR #924 by LazarusX.
- Name the exact executable setting when ripgrep is missing.

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
