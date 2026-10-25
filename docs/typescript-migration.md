# TypeScript migration

The extension keeps its existing settings, commands, publisher identity, and behavior. Each migration step must pass its focused tests and the project checks before the next step begins.

## Sequence

- [x] Compile the existing runtime and migrate the four static catalogs.
- [x] Type configuration, highlighting attributes, search results, ripgrep, and utilities.
- [x] Type icons, colors, and editor decorations.
- [x] Model tree nodes and the VS Code tree-provider API.
- [x] Type editor orchestration and extension commands.
- [x] Convert tests, build configuration, and maintenance scripts to TypeScript.
- [x] Remove the temporary JavaScript compiler allowance and verify the packaged extension.

Runtime TypeScript compiles to CommonJS JavaScript before tests and packaging. Development-only `.mts` files run directly on the locked Node 24 runtime and receive a separate strict type check. Generated JavaScript belongs in ignored output directories. Original language fixtures remain test data. DotENV and dotplan retain their declarative JSON grammars.

The final compiler configurations do not allow JavaScript sources. All maintained runtime code, tests, scripts, and build configurations use strict TypeScript. SDK and VM test adapters make their casts at the external boundary. No source file disables type checking.

## Completed steps

| Repository             | Local versions        | Scope                                                                    | Regression tests |
| ---------------------- | --------------------- | ------------------------------------------------------------------------ | ---------------: |
| vscode-dotenv          | 1.0.4                 | Grammar tests, validation and release tools                              |               12 |
| vscode-dotplan         | 1.0.1                 | Grammar tests, validation and release tools                              |               16 |
| vscode-better-comments | 1.0.9, 1.0.10         | Runtime types, native TypeScript tests and tools, both extension bundles |               52 |
| vscode-todo-tree       | 1.0.13 through 1.0.18 | Catalogs, search, rendering, tree nodes, commands, tests and tools       |              185 |

Each version has a separate commit, local tag, changelog entry and VSIX package. The migration versions have not been pushed or published.

The migration also fixed compiler-exposed defects: leaked tag/navigation temporaries, invalid built-in icon comparisons, string ruler lanes, non-boolean folder flags, numeric tree item IDs, missing command titles, folder compaction with TODO children, and missing editor or storage assumptions. Focused regressions cover these corrections.

## Verification

Run `nix develop --command just check` and `nix develop --command just package` in each repository. Delete only ignored compiler and bundle output before a clean rebuild: `out` and `dist` for Todo Tree and Better Comments, and `dist` for the grammar extensions.

The packages still contain JavaScript where VS Code requires it. JSON grammars remain declarative, and Better Comments retains original upstream language fixtures as test data. Node 24 is a development requirement; VS Code runs the compiled bundles.

The final Linux verification passed all 265 regressions, formatting, lint, type checks, builds, dependency audits and VSIX packaging. Fresh builds started without generated output. The audits reported no vulnerabilities.

Packaged extensions also passed an isolated VS Code 1.143.1 smoke test. Todo Tree searched a path containing spaces, parentheses and `$`, refreshed two edited files, and retained grouped and tags-only results. Better Comments activated and respected language overrides through two language changes. DotENV produced the expected tokens under ten themes and preserved an explicit plaintext association. Dotplan recognized all 13 sample marker lines. The extension host reported no errors and shut down cleanly.

The VSIX identities, settings and command contributions match the previous releases; both JSON grammars are byte-for-byte unchanged. The existing Windows and macOS CI jobs use the new test and build commands, but have not run for these local commits.
