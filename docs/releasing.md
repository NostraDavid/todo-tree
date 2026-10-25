# Publish a small release

Publish one useful fix or feature when it is ready. Do not wait for unrelated work.
The first NostraDavid release is **1.0.0**. The original project's `0.0.x` history has a separate [archive](upstream-CHANGELOG.md).

Use patch versions such as `1.0.1` for compatible fixes, minor versions such as `1.1.0` for compatible features, and major versions for breaking changes.
The move to `1.0.0` establishes this fork's own release history. It does not rename existing `todo-tree.*` settings.

## Prepare the version

1. Start from an updated checkout and enter `nix develop`.
2. Run `just sync` to install the locked dependencies.
3. For the first release, keep the existing version `1.0.0`. For the next compatible fix, run:

   ```bash
   just version patch
   ```

   This updates both npm manifests without making a commit or tag.
   Use `just version minor` or `just version major` when the compatibility change requires it.

4. Move the completed items from **Unreleased** into a dated section such as `## [1.0.1] - 2026-10-26`.
5. Keep an empty **Unreleased** section for the next change.
6. Describe what changes for users. Link imported PRs and credit their authors.
7. Run `just format`, `just check`, and `just package`.
8. Install the resulting VSIX in a separate VS Code profile and follow [the first TODO guide](getting-started.md).
9. Review the changes and commit them with a scoped message such as `release: prepare 1.0.1`.

`just release-check` rejects a package or lockfile version that does not match the changelog.
The release workflow also checks that its Git tag matches the package version.

## Create the GitHub release

For the first release, run the following commands after its checks pass:

```bash
git tag -a v1.0.0 -m 'Release 1.0.0'
git push origin master
git push origin v1.0.0
```

For later releases, substitute their version in the tag and message.
The tag starts the **Release** GitHub Actions workflow. The workflow checks the project, packages the extension, and attaches the VSIX to a GitHub release.
Its release notes contain only that version's changelog entry.
The first push to a fork may require enabling Actions in the repository's **Actions** tab.
Wait for the **Check** workflow's Linux, macOS, and Windows results before publishing to the Marketplace.

## Publish to Visual Studio Marketplace

The publisher is `nostradavid`. Its extension identifier is `nostradavid.nostradavid-todo-tree`.
GitHub releases and Marketplace releases are separate publications.

1. Download the tested VSIX from the GitHub release.
2. Sign in to [the nostradavid publisher page](https://marketplace.visualstudio.com/manage/publishers/nostradavid).
3. For the first version, choose **New extension**, then **Visual Studio Code**, and upload the VSIX.
4. For an existing listing, choose its update action and upload the new VSIX.
5. Wait for Marketplace validation to finish.
6. Confirm that the public listing shows the intended publisher and version.
7. Install that version from the Marketplace in a separate profile and check one TODO search.

Keep Marketplace credentials out of the repository, terminal output, and issue reports.
This workflow uses a manual upload, so the GitHub release job does not require a Marketplace token.
If you later automate Marketplace publication, follow the [current Microsoft publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

If a published version is broken, fix it and publish the next patch version. Do not move a public tag or reuse a published version number.
