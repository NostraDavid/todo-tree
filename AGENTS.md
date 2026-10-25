# Todo Tree by NostraDavid

Use Node.js 24 and the locked Nix development shell. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and verification.
Run `just format` after edits and `just check` before committing. Run `just package` after changes to the build, assets, or extension manifest.

Keep runtime changes focused and preserve existing `todo-tree.*` settings and command identifiers.
Add a focused regression test for bug fixes. Keep original commit authorship when importing upstream PRs.
Retain the original MIT license and copyright notice.

Write scoped commit messages, for example `ripgrep: expand home-relative executable paths`.
Record user-visible changes under `Unreleased` in `CHANGELOG.md`. Use [the release procedure](docs/releasing.md) when preparing a version.
Do not add Marketplace credentials to source files or logs.
