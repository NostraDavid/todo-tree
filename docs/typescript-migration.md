# TypeScript migration

The extension keeps its existing settings, commands, publisher identity, and behavior. Each migration step must pass its focused tests and the project checks before the next step begins.

## Sequence

- [x] Compile the existing runtime and migrate the four static catalogs.
- [x] Type configuration, highlighting attributes, search results, ripgrep, and utilities.
- [x] Type icons, colors, and editor decorations.
- [x] Model tree nodes and the VS Code tree-provider API.
- [ ] Type editor orchestration and extension commands.
- [ ] Convert tests, build configuration, and maintenance scripts to TypeScript.
- [ ] Remove the temporary JavaScript compiler allowance and verify the packaged extension.

Runtime TypeScript compiles to CommonJS JavaScript before tests and packaging. Development-only `.mts` files run directly on the locked Node 24 runtime and receive a separate strict type check. Generated JavaScript belongs in ignored output directories. Original language fixtures remain test data. DotENV and dotplan retain their declarative JSON grammars.

The temporary `allowJs` setting lets the existing runtime stay operational between migration steps. The final step removes that allowance. It does not use unchecked TypeScript files or duplicate implementations.
