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

## Publish a release

For the first release, run the following commands after its checks pass:

```bash
git tag -a v1.0.0 -m 'Release 1.0.0'
git push origin master
git push origin v1.0.0
```

For later releases, substitute their version in the tag and message.
The tag starts the **Release** GitHub Actions workflow. The workflow checks the project, packages the extension, and attaches the VSIX to a GitHub release.
Its release notes contain only that version's changelog entry.
A separate job downloads that exact VSIX, checks its publisher and version, and publishes it to Marketplace. It does not rebuild the extension.
The job waits up to two minutes for Marketplace to list the version and fails if it cannot verify publication.
The first push to a fork may require enabling Actions in the repository's **Actions** tab.
Wait for the **Check** workflow's Linux, macOS, and Windows results before publishing to the Marketplace.

## Connect Marketplace once

The publisher is `nostradavid`. Its extension identifier is `nostradavid.nostradavid-todo-tree`.
The workflow needs a repository secret named `VSCE_PAT` before it can publish there.
This credential authenticates uploads to Microsoft's Marketplace. GitHub's builds and releases do not need Azure DevOps.

The PAT setup requires an Azure DevOps organization.
Microsoft now [requires an active Azure subscription to create a new organization](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/create-organization?view=azure-devops).
Its free usage allowance does not remove that subscription and billing requirement.
If you have no organization and do not want an Azure subscription, use the manual upload at the end of this guide with your existing Marketplace publisher.
The GitHub build and release steps remain usable without a Marketplace credential.

1. Follow Microsoft's [Personal Access Token setup](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token).
   Use the Microsoft account that owns this publisher and an existing Azure DevOps organization, or create one only after reviewing the subscription requirement above.
2. Select **All accessible organizations** and only the **Marketplace: Manage** scope.
3. Give the token a short lifetime, at most 30 days. Do not choose an expiry after **2026-12-01**.
4. Open [the repository's Actions secrets](https://github.com/NostraDavid/todo-tree/settings/secrets/actions).
5. Create a repository secret named **VSCE_PAT** and paste the token directly into its secret field.
6. Save the secret. Do not paste the token into chat, source files, terminal commands, or issue reports.

Only the Marketplace publishing steps receive this secret. Tests and package builds do not receive it.
If the secret is missing, the publishing job stops with a setup error. GitHub release creation can still succeed.

Microsoft's [trusted publishing implementation](https://github.com/microsoft/vscode-vsce#trusted-publishing) can request short-lived credentials from GitHub.
However, [Microsoft confirms that the Marketplace backend does not yet fully support it](https://github.com/microsoft/vscode-vsce/issues/1275).
The publisher page currently has no trusted-publishing configuration, so this workflow uses the supported PAT flow.
Microsoft's publishing guide announces retirement of global Azure DevOps PATs on **2026-12-01**.
Before that date, configure Marketplace trusted publishing when it becomes available, grant only the publishing job `id-token: write`, replace `VSCE_PAT` with `--oidc`, and remove the stored secret.
If Microsoft has not enabled trusted publishing, use its [documented Microsoft Entra ID alternative](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace).

## Publish an existing GitHub release

Use this to publish the already-built **v1.0.0**, or to retry after fixing credentials or a Marketplace outage.
It does not move the tag or change the GitHub release asset.

1. Open the repository's **Actions** tab.
2. Select **Release**, then **Run workflow**.
3. Use the `master` branch and enter the existing release tag, such as `v1.0.0`.
4. Run the workflow. The GitHub build job is skipped and the Marketplace job downloads the existing release asset.
5. Confirm that **Verify the published version** passes, then check [the public listing](https://marketplace.visualstudio.com/items?itemName=nostradavid.nostradavid-todo-tree).

The equivalent command is:

```bash
gh workflow run release.yml --repo NostraDavid/todo-tree --ref master -f tag=v1.0.0
```

Repeated publication uses `--skip-duplicate`, so it preserves an already-published version.
Concurrent attempts for the same tag are serialized. A tag-triggered retry also preserves the existing GitHub asset.
If Marketplace validation or indexing takes longer than two minutes, wait for it to finish and rerun the failed job.

## Check and recover a release

Install the public Marketplace version in a separate VS Code profile and check one TODO search.
If a published version is broken, fix it and publish the next patch version. Do not move a public tag or reuse a published version number.

If automatic publication is unavailable, download the tested VSIX from the GitHub release and upload it through [publisher management](https://marketplace.visualstudio.com/manage/publishers/nostradavid).
For the first version, choose **New extension**, then **Visual Studio Code**. For later versions, use the listing's update action.
