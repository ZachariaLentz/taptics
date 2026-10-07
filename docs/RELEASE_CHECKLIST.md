# Release checklist

Repository validation is documented in `VALIDATION.md`. This checklist covers external configuration and device verification needed before distribution.

## Backend and authentication

- [x] Production Taptics Supabase backend created and the checked-in v1 migration deployed (reported by Zach). This SDK/auth pass does not change the schema.
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in local/EAS environments. These are public client values; `.env.example` stays blank.
- [ ] Enable email/password auth, confirmation, production SMTP and rate limits. Set Site URL `taptics://auth/confirm`; allow exact redirects `taptics://auth/confirm` and `taptics://auth/recovery`. Keep email template links on `{{ .ConfirmationURL }}`; see `supabase/README.md`.
- [ ] On the installed iPhone app, sign up, open the confirmation email, return with a session, log out/log in, request reset, open its link and save a new password. Test cold launch, foreground, expired/replayed links and an account switch while recovery is open. Request/open PKCE links on the same installation.
- [ ] Confirm the `public` schema is exposed to Data API. Run Supabase Security/Performance Advisors; verify only private reads and award/delete RPCs are granted to authenticated clients.
- [ ] Test two separate accounts: neither can read the other's completions/profile or directly write reward tables. Verify account deletion removes data and the user cannot award again with an old token.
- [ ] Verify two-device offline Daily conflict resolution, queued Flash uploads, login/confirmation/logout, expired session refresh and reconnect behavior against deployed Supabase.

## Native build and store accounts

- [ ] Reserve final bundle/package identifiers and set `expo.ios.bundleIdentifier` and `expo.android.package` in `app.json`. Identifiers are intentionally not assigned to an unverified developer account.
- [ ] Use Node 22 LTS (22.23.1 recommended). Log in with `npx eas-cli login`, then `npx eas-cli init` to link Zach's actual Expo project. Commit the resulting real `extra.eas.projectId`/owner configuration if appropriate. No project ID or signing credentials are fabricated.
- [ ] In EAS, configure the public URL and publishable key for the `development`, `preview` and `production` environments used by `eas.json`. Use plaintext/sensitive visibility as appropriate; these values are bundled in the client. Never configure a backend secret/service-role key.
- [ ] EAS profiles include a development client/internal distribution, standalone internal preview and production store build. iOS profiles pin documented `macos-tahoe-26.5-xcode-26.6` (Xcode 26.6); Android uses `sdk-57`. The iOS minimum is 16.4. This image meets [Apple’s current Xcode 26/iOS 26 SDK submission requirement](https://developer.apple.com/news/upcoming-requirements/?id=04282026a). Do not switch SDK 57 to an Xcode 27 image without following Expo's scene-lifecycle guidance and enabling its required config; the chosen Xcode 26.6 image avoids that separate migration.
- [ ] Configure Apple Developer/App Store Connect and Google Play Console, signing credentials, App Store app record, Play application, and provisioning devices for internal iOS preview builds.
- [ ] Run `npx eas-cli build --profile preview --platform ios` (and `--platform android` when configured); install on actual iOS/Android devices. Confirm sound, haptics, app lifecycle, touch targets, text scaling, screen-reader labels, keyboard, safe areas and background/resume behavior.
- [ ] For Metro development, run `npx eas-cli build --profile development --platform ios`, install it and use `npx expo start --dev-client`. Preview embeds the bundle and does not need Metro.
- [ ] Run the device checklist below, then production builds with `npx eas-cli build --profile production --platform all`. Distribute TestFlight/Play internal testing and collect user feedback before submitting.

## Device acceptance

- [ ] Fresh install with no backend values: Home loads, guest training and Daily work, progress survives force-close/reopen.
- [ ] Level 1 starts easy. Finish exactly ten answers; answer ten counts; rapidly tap answer and Next buttons and verify one count/award. Pass advances; fail can retry.
- [ ] Confirm multiplication/division instructions are understandable and terms flash separately. Test level 12 decimals and higher-level timing.
- [ ] Background during Flash, return, replay the round, and complete without a phantom answer.
- [ ] Complete Daily incorrectly/correctly on separate days; revisiting/relaunching cannot replay today's submission. Midnight refresh yields the new puzzle, including timezone travel behavior.
- [ ] Refresh/reopen Score; XP remains unchanged. Deep-link to Score with no result shows a useful fallback.
- [ ] Airplane mode: complete training/Daily, reconnect and Sync, verify cloud totals. Verify conflicting Daily across two devices rewards once.
- [ ] Sign up from a played guest profile, confirm email, then explicitly import. Verify original IDs, completion-derived totals, visible queued/confirmed states and logout restoring the unchanged guest copy.
- [ ] Merge into an existing account with Daily-date/ID conflicts: review counts, keep account results, and verify choosing not to import changes nothing. Interrupt an import after a partial upload, restart/reconnect, and confirm retries cannot reward twice.
- [ ] Delete a test account; cloud records and cached account data disappear, and guest play remains available.

## Product/legal/store materials

- [ ] Provide final app icon, splash artwork and screenshots (current repository icons are prototype assets).
- [ ] Publish a privacy policy and support/contact page. Describe optional email/account information, progress data, Supabase hosting, local guest data, retention and deletion. Add policy/support links to store listings and review whether in-app links are required for the chosen stores.
- [ ] Complete App Privacy and Google Data Safety forms truthfully, age/content rating, category, description, keywords and accessibility information. Confirm any child-directed audience requirements before marketing to children.
- [ ] Confirm native privacy manifests and encryption/export compliance on the signed release binaries, including all third-party SDK disclosures.
- [ ] Supply reviewer instructions/test credentials if account sync is reviewed. Guest core gameplay should remain accessible without registration.
- [ ] Complete TestFlight/Play feedback triage, crash checks and signed-build smoke tests before store submission.

Development-ready means the repository installs, checks and bundles. Beta-ready additionally requires a deployed backend (if enabled), signed device-tested binaries and successful account integration tests. Store-submission-ready additionally requires current toolchain compliance, listings, privacy materials and developer-account credentials. This repository alone cannot supply those account/device steps.

## Native project policy

Use Expo Continuous Native Generation. `ios/` and `android/` are ignored and are generated by EAS/prebuild; do not commit them. Bundle/package identifiers remain absent until Zach reserves and enters the real values in `app.json`. `expo-dev-client` is installed for the development profile. No Apple team, Expo project, signing credentials or account-specific identifiers are assumed.

After identifiers, Expo project linking, public environment values, Apple Developer authentication and iPhone UDID registration (`npx eas-cli device:create`), the preview command is:

```sh
npx eas-cli build --profile preview --platform ios
```

Allow EAS to configure the real signing/provisioning credentials interactively. Install the internal build link on a registered iPhone and enable Developer Mode if iOS requests it. Preview is ad hoc internal distribution; production is the separate store/TestFlight build. A Linux prebuild/export cannot certify Xcode compilation or device behavior.
