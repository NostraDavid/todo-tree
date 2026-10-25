# Make your first change

This guide takes you from a fresh clone to a tested extension package.
You do not need an Azure account or Marketplace credentials to develop or package the extension.

## Get the source

Install [Git](https://git-scm.com/downloads), then clone the repository:

```bash
git clone https://github.com/NostraDavid/todo-tree.git
cd todo-tree
```

The `src` directory contains the extension code. The `test` directory contains QUnit tests.
`package.json` defines the extension identity, settings, and build commands.

## Enter the development environment

On Linux or macOS, install [Nix with flakes enabled](https://nixos.org/download/), then run:

```bash
nix develop
just setup
```

The shell provides Node.js 24, Just, dprint, Oxlint, prek, and the Nix and workflow checks.
`flake.lock` pins the Nix packages. `package-lock.json` pins the Node dependencies.
The first run downloads these tools and dependencies. Entering the shell does not install hooks or change your checkout.

`just setup` installs the locked Node dependencies and a repository-local pre-commit hook.
The hook checks the project before a commit. Your global Git configuration stays unchanged.
Run `just` to list the available commands.

On Windows, install Node.js 24 and Git, then run `npm ci`, `npm test`, and `npm run build` in a terminal.
For the full Just and Nix workflow, use WSL2 with Nix. CI also runs the Node tests, build, and packaging on native Windows and macOS.

## Build and open the extension

```bash
just build
code .
```

In VS Code, press **F5** and choose **Run Extension**.
A separate **Extension Development Host** window opens with this checkout loaded.
Disable any installed copy of the original Todo Tree or this fork in that test window to avoid duplicate commands.
Open a folder, add a `// TODO:` comment, and check the Todo Tree view.

For repeated edits, run `just watch` in a terminal.
After the bundle rebuilds, use **Developer: Reload Window** in the Extension Development Host.

## Change one behavior

1. Create a branch with `git switch -c your-change`.
2. Find the relevant code in `src`.
3. Add a focused test in `test` and reproduce the bug before changing the implementation.
4. Change the code and run `just test`.
5. Add a short entry under **Unreleased** in `CHANGELOG.md`.

Use small changes that can be reviewed and released separately.
When you take a change from an upstream PR, keep its original authorship and link the PR in the changelog.
The original MIT license and copyright notice must remain in distributed copies.

## Check the result

```bash
just format
just check
just package
```

`just format` rewrites formatting. `just check` checks formatting, lint, tests, the production build, release metadata, and dependency advisories.
An unavailable advisory service makes the audit fail, so retry it when your network is available.
Packaging produces `nostradavid-todo-tree-<version>.vsix` without uploading anything.
The production build uses the committed codicon list and does not fetch a changing file from the internet.

The packaging tool uses `@vscode/vsce` 3.9.2 with npm overrides for `@azure/identity` 4.13.0 and `uuid` 11.1.1.
The Identity pin avoids an MSAL version affected by [GHSA-xcx6-jx8p-x3h5](https://github.com/advisories/GHSA-xcx6-jx8p-x3h5).
The UUID pin repairs [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) while preserving its CommonJS `v4` API.
These dependencies belong to the development tooling and are not bundled into the extension.
Remove the overrides when the tool resolves fixed dependencies, then rerun the audit and VSIX packaging.

Open the VSIX in a separate VS Code profile and follow the [first TODO guide](docs/getting-started.md).
The automated Node tests do not replace this check in the actual editor.

Use a scoped commit message such as `ripgrep: expand home-relative executable paths`.
Useful scopes include `ripgrep`, `tree`, `highlights`, `build`, `tooling`, `docs`, and `release`.
Run [the release procedure](docs/releasing.md) when the change is ready for users.
