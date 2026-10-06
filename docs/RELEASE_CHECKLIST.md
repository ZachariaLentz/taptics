# Release checklist

Repository validation is documented in `VALIDATION.md`. This checklist covers external configuration and device verification needed before distribution.

## Backend and authentication

- [ ] Create/select the production Taptics Supabase project. The connected account available during implementation did not expose a Taptics project; no live schema was changed.
- [ ] Back up any prototype database. Review required legacy profile columns/custom triggers and the legacy-data notes in `supabase/README.md` before applying the migration.
- [ ] Run `supabase login`, `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push` (or execute the checked-in migration once in SQL editor).
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in local/EAS build environments. These are public client values. Keep service-role credentials out of builds.
- [ ] Enable email/password auth, confirmation, production SMTP and rate limits. Configure Site URL, confirmation URLs and a hosted password-recovery page. Test reset email through that page; the app currently requests reset mail but does not contain a recovery callback screen.
- [ ] Confirm the `public` schema is exposed to Data API. Run Supabase Security/Performance Advisors; verify only private reads and award/delete RPCs are granted to authenticated clients.
- [ ] Test two separate accounts: neither can read the other's completions/profile or directly write reward tables. Verify account deletion removes data and the user cannot award again with an old token.
- [ ] Verify two-device offline Daily conflict resolution, queued Flash uploads, login/confirmation/logout, expired session refresh and reconnect behavior against deployed Supabase.

## Native build and store accounts

- [ ] Reserve final bundle/package identifiers and set `expo.ios.bundleIdentifier` and `expo.android.package` in `app.json`. Identifiers are intentionally not assigned to an unverified developer account.
- [ ] Log in to Expo/EAS and run `npx eas-cli init` to bind Zach's project. `eas.json` includes internal-preview and production profiles; no EAS project ID or signing credentials are fabricated.
- [ ] Before store builds, check the current Apple Xcode/iOS SDK and Google target API requirements with Zach's build account. SDK 52 was retained and patched because local build/export validation succeeds; it is older than current Expo Go and may require an Expo SDK upgrade for current store toolchains. Choose the smallest supported SDK for the actual EAS image, then rerun the full suite. Do not submit based only on JavaScript bundle export.
- [ ] Configure Apple Developer/App Store Connect and Google Play Console, signing credentials, App Store app record, Play application, and provisioning devices for internal iOS preview builds.
- [ ] Run `npx eas-cli build --profile preview --platform all`; install on actual iOS/Android devices. Confirm sound, haptics, app lifecycle, touch targets, text scaling, screen-reader labels, keyboard, safe areas and background/resume behavior.
- [ ] Run the device checklist below, then production builds with `npx eas-cli build --profile production --platform all`. Distribute TestFlight/Play internal testing and collect user feedback before submitting.

## Device acceptance

- [ ] Fresh install with no backend values: Home loads, guest training and Daily work, progress survives force-close/reopen.
- [ ] Level 1 starts easy. Finish exactly ten answers; answer ten counts; rapidly tap answer and Next buttons and verify one count/award. Pass advances; fail can retry.
- [ ] Confirm multiplication/division instructions are understandable and terms flash separately. Test level 12 decimals and higher-level timing.
- [ ] Background during Flash, return, replay the round, and complete without a phantom answer.
- [ ] Complete Daily incorrectly/correctly on separate days; revisiting/relaunching cannot replay today's submission. Midnight refresh yields the new puzzle, including timezone travel behavior.
- [ ] Refresh/reopen Score; XP remains unchanged. Deep-link to Score with no result shows a useful fallback.
- [ ] Airplane mode: complete training/Daily, reconnect and Sync, verify cloud totals. Verify conflicting Daily across two devices rewards once.
- [ ] Delete a test account; cloud records and cached account data disappear, and guest play remains available.

## Product/legal/store materials

- [ ] Provide final app icon, splash artwork and screenshots (current repository icons are prototype assets).
- [ ] Publish a privacy policy and support/contact page. Describe optional email/account information, progress data, Supabase hosting, local guest data, retention and deletion. Add policy/support links to store listings and review whether in-app links are required for the chosen stores.
- [ ] Complete App Privacy and Google Data Safety forms truthfully, age/content rating, category, description, keywords and accessibility information. Confirm any child-directed audience requirements before marketing to children.
- [ ] Confirm native privacy manifests and encryption/export compliance on the signed release binaries, including all third-party SDK disclosures.
- [ ] Supply reviewer instructions/test credentials if account sync is reviewed. Guest core gameplay should remain accessible without registration.
- [ ] Complete TestFlight/Play feedback triage, crash checks and signed-build smoke tests before store submission.

Development-ready means the repository installs, checks and bundles. Beta-ready additionally requires a deployed backend (if enabled), signed device-tested binaries and successful account integration tests. Store-submission-ready additionally requires current toolchain compliance, listings, privacy materials and developer-account credentials. This repository alone cannot supply those account/device steps.
