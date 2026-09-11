# Releasing Daydock betas

Daydock desktop releases are built by GitHub Actions for Windows, macOS, and Linux. Every numbered release remains a GitHub prerelease while Daydock is in beta. The workflow publishes two rolling manifests to the `beta-channel` release so installed beta builds and the download website can discover the newest version without relying on GitHub's stable-release alias.

## Updater signing key

Tauri updater signatures prove that an update was produced by the Daydock release pipeline. They are separate from Windows Authenticode and Apple Developer ID code signing.

- The public key is committed in `src-tauri/tauri.conf.json`.
- The private key is stored in the `TAURI_SIGNING_PRIVATE_KEY` GitHub Actions secret.
- The maintainer must keep a secure offline backup of the private key. Losing it prevents existing installations from accepting future updates.
- Never commit the private key or print it in CI logs.

If the signing key must be rotated, ship an app version that trusts the new public key while updates signed by the old key are still possible. Do not simply replace the public key in source after users have installed an updater-enabled build.

## Apple signing and notarization

For normal public distribution, macOS releases should be signed with an Apple Developer ID Application certificate and notarized. During the current unsigned beta phase, the workflow falls back to ad-hoc signing when any required Apple secret is missing so one platform cannot block the Windows and Linux release.

Add these GitHub Actions repository secrets:

- `APPLE_CERTIFICATE`: the Developer ID Application `.p12` exported from Keychain Access and then base64-encoded.
- `APPLE_CERTIFICATE_PASSWORD`: the password used when exporting that `.p12`.
- `KEYCHAIN_PASSWORD`: a strong temporary password used for the CI-only keychain.
- `APPLE_ID`: the Apple ID belonging to the developer account.
- `APPLE_PASSWORD`: an app-specific password created for that Apple ID.
- `APPLE_TEAM_ID`: the ten-character Apple Developer Team ID.

When all six secrets are available, the workflow imports the certificate into an ephemeral keychain, discovers its full signing identity, and supplies the Apple credentials to Tauri. Tauri signs the app, submits it for notarization, and staples the notarization ticket to the distributed bundle. Keep these secrets separate from `TAURI_SIGNING_PRIVATE_KEY`; the latter protects updater authenticity and does not satisfy Gatekeeper.

Until those credentials are configured, the workflow publishes an unsigned macOS beta instead of failing the entire release. macOS will show a Gatekeeper warning on first launch, but the updater artifact is still independently signed with the Tauri updater key.

## Create a beta release

1. Choose a SemVer version such as `0.3.0`.
2. Set that exact version in:
   - `package.json`
   - `package-lock.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/Cargo.lock`
   - `src-tauri/tauri.conf.json`
3. Update user-facing release notes and documentation when behavior changed. If the release should replace the website's emergency fallback, update both fallback manifests in `website/lib/downloadManifest.ts` and `website/app/download/DownloadPage.tsx`; normal download buttons advance from the rolling channel automatically.
4. Run:

   ```powershell
   npm ci
   npm test
   npm run build
   cargo test --manifest-path src-tauri/Cargo.toml
   npm run tauri build
   ```

5. Commit and push the release changes.
6. Tag the release and push the tag:

   ```powershell
   git tag v0.3.0
   git push origin v0.3.0
   ```

The `Release desktop apps` workflow then:

1. Builds the Windows NSIS installer, Apple-signed and notarized universal macOS DMG, and Linux AppImage.
2. Signs the platform-specific updater packages with the Tauri updater key.
3. Creates a numbered GitHub prerelease and uploads the installers, signatures, and `latest.json`.
4. Copies the completed `latest.json` updater manifest to the rolling `beta-channel` release.
5. Generates `downloads.json` from the release's Windows installer, macOS DMG, and Linux AppImage, then publishes it to the same channel for the website.

Installed beta builds check this stable endpoint:

```text
https://github.com/AbhiraajKonduru/daydock/releases/download/beta-channel/latest.json
```

The website resolves its version and human-friendly installers from:

```text
https://github.com/AbhiraajKonduru/daydock/releases/download/beta-channel/downloads.json
```

## Verify a release

After the workflow completes:

1. Open the numbered release and confirm that `latest.json` and signed updater artifacts are present for all three desktop platforms.
2. Open the `beta-channel` release and confirm that both `latest.json` and `downloads.json` report the new version.
3. Test an upgrade from the previous installed version on each platform. Do not test only a clean install—the updater path and installer path exercise different behavior.
4. Confirm that choosing **Later** leaves the toolbar reminder, and that **Update and restart** saves an unsaved edit before installation.

The first release containing the updater must be installed manually by existing users. Only builds that already contain the updater plugin and public key can discover future releases.
