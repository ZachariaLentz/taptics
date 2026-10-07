# Validation and audit

## Current SDK 57 release pass — 2026-10-07

Started from the freshly cloned `dev` at `3a79bac8c58bfeaebe768d9e37e58cbef22666dd`, on `codex/upgrade-expo-sdk-57`. No prior feature branch was used; no `AGENTS.md` was present. Production backend creation and migration deployment were reported by Zach. This pass makes no database/schema changes.

### Upgrade review and compatibility

Reviewed Expo's [incremental upgrade guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) and the official [SDK 53](https://expo.dev/changelog/sdk-53), [54](https://expo.dev/changelog/sdk-54), [55](https://expo.dev/changelog/sdk-55), [56](https://expo.dev/changelog/sdk-56) and [57](https://expo.dev/changelog/sdk-57) changelogs. Installed each stable SDK in sequence using `npx expo install expo@<patch> --fix`: 53.0.27 → 54.0.37 → 55.0.31 → 56.0.23 → 57.0.27. Compatibility checks were used at intermediate stages; TypeScript, lint and tests identified and resolved the React 19/SDK migration issues before final validation. Expo compatibility tooling selected native package versions; the test renderer follows the selected React version.

SDK 53's npm resolution encountered an optional Router/server-rendering peer conflict. Scoped `npm_config_legacy_peer_deps=true` was used only for intermediate transitions; neither `.npmrc` nor final install commands contain a peer override. Final plain `npm ci` and `npm ls --depth=0` pass. SDK 55 passed all then-current 49 tests; the final expanded suite passes 53. No existing tests were deleted or assertions weakened. React 19 renderer tests select the real shared Button component rather than relying on memoized Pressable identity.

Final installed versions include Expo **57.0.27**, React Native **0.86.3**, React/DOM/test renderer **19.2.3**, Reanimated **4.5.1**, Worklets **0.10.1**, Gesture Handler **2.32.0**, Expo Router **57.0.25**, AsyncStorage **2.2.0**, Supabase JS **2.117.2** and TypeScript **6.0.3**. SDK 58 is not installed. This stable patch includes the SDK 57 Hermes memory/startup fixes (57.0.9/57.0.17). Worklets was added for Reanimated; the unused direct React Navigation dependency was removed. The explicitly used icon library has a direct font peer. Audio has its required asset peer and a playback-only config plugin (no microphone/background audio permissions).

The New Architecture is mandatory in current React Native; obsolete `newArchEnabled` configuration was removed. TypeScript uses bundler resolution and explicit ambient types. Flat ESLint configuration retains zero-warning enforcement and the no-eval rule; only Jest mock factories receive a scoped CommonJS-import allowance. New React lint checks prompted render-state mirrors for immutable Daily retry data/device guest ID, effect-time sound-ref updates and deferred boot/sync effects. Synchronous double-tap locks and durable retry IDs remain intact. SDK 57's default expo/fetch is retained; the Jest setup eagerly resolves its lazy global while native mocks are alive to avoid a teardown-only failure.

### Final validation

Run in the supplied Linux environment, Node 24.19.0/npm 11.9.0. CI uses Node 22 LTS; the pinned EAS iOS image supplies Node 22.23.1.

| Command / check | Result |
| --- | --- |
| `npm ci` | Passed plain clean install: 1,097 packages; no peer overrides |
| `npx expo install --fix` / `npx expo install --check` | Compatible / up to date |
| `npx expo-doctor` | Passed **21/21** with `NODE_USE_ENV_PROXY=1` for this environment's HTTP proxy |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npx jest --runInBand` | Passed **13 suites / 53 tests** (all original 37 retained) |
| `npm run test:database` | Passed unchanged real migration/RPC/RLS regression suite in PGlite/PostgreSQL |
| `npx expo export --platform web` | Passed static rendering, including both auth routes |
| `npx expo export --platform ios --platform android --output-dir /tmp/taptics-final-native` | Passed both Hermes bundles |
| `npx expo config --type introspect --json` | Passed config/plugin introspection |
| `CI=1 npx expo prebuild --no-install --platform all` | Passed in a disposable source copy; generated iOS/Android folders never added to Git |
| Chromium/Playwright browser smoke, 390×844 | Passed fresh guest boot, ten sequential Flash rounds, 10/10, level 2, read-only Score reload, persistent Daily lock/revisit, real Progress and Profile; no page errors |
| `npm ls --depth=0`, `git diff --check`, repository audit | Passed installed-version/branch/dependency and whitespace checks |

Doctor's first unproxied run could not fetch schema/Directory metadata and found the missing direct audio asset peer. The peer was installed via Expo; the final complete checks pass without disabling network checks. Only the preexisting pure-JavaScript `seedrandom` metadata exclusion is retained.

Prebuild used scratch-only `dev.validation.taptics` identifiers to avoid interactive identifier prompts; they are absent from committed app/EAS configuration. Generated plist/manifest register `taptics`, Hermes is enabled, and the generated Xcode target is iOS **16.4**. Microphone and background-audio permissions are absent. `ios/` and `android/` remain ignored under CNG. EAS iOS profiles pin [the documented Xcode 26.6 image](https://docs.expo.dev/build-reference/infrastructure/) and satisfy [Apple's current Xcode 26/iOS 26 SDK requirement](https://developer.apple.com/news/upcoming-requirements/?id=04282026a). A future Xcode 27 move needs Expo's explicit scene lifecycle configuration; it is not part of these pinned builds.

### Behavior and security audit

The original gameplay, completion-derived progression, guest import, storage engine and backend migration are retained. Tests still prove real-level Flash generation, term sequencing, exactly ten accepted answers, double-tap locks, read-only Score, local-date Daily uniqueness/saved results, durable guest copies, opt-in reviewed import, account conflict precedence, queued offline results, idempotent lost-ack retries and authenticated-actor deletion. New tests cover exact callback parsing/errors, PKCE confirmation/recovery, duplicate cold/warm delivery, same-account refresh, recovery revocation on logout/account switch, delayed callback rejection, password validation/form locking, secure native PKCE crypto, guest restoration and import consent after recovery/refresh, and rapid auth-switch stale-review protection.

The production SQL migration and database test script are byte-for-byte unchanged. No new user/actor RPC parameters, direct table writes, client XP updates or metadata-based authorization were introduced. Searches found no legacy Supabase env name, actual secret/service key or private-key material, or obsolete APIs in active source. Old SDK/API references below are explicitly historical evidence, not current setup instructions. `.env.example` contains only blank placeholders; the client reads a public URL/publishable key. Email verification remains enabled in the documented setup.

Repository is ready for a real EAS iPhone preview build **after** Zach supplies final bundle/package identifiers, links his Expo project, configures public EAS environment values/Supabase email redirects, authenticates to Apple and registers/provisions his iPhone. Native Xcode/Gradle compilation, signing, physical sound/haptics and live Supabase email/Auth/PostgREST acceptance cannot be certified by Linux prebuild/bundle tests. Follow `RELEASE_CHECKLIST.md` and `supabase/README.md`; do not redeploy the already-applied migration. No live backend or developer-account configuration was changed here.

## Historical v1 validation (prior to the SDK upgrade)

The following notes preserve prior release evidence. Their old SDK versions and deployment availability describe those earlier passes only.


Work started from `dev` commit `7023722` on branch `codex/finish-taptics-v1` on 2026-10-06.

## Baseline

The repository had no `AGENTS.md`. Routes, source, package/lock versions, docs, assets, and Supabase calls were audited before changes.

- `npm ci`: initial attempt failed because the managed environment's npm cache directory was not writable. Repeating with `--cache /tmp/taptics-npm` succeeded (1,143 packages).
- `npx tsc --noEmit`: passed; static types did not detect the gameplay/state bugs.
- `npm run lint`: no ESLint configuration/dependencies were supplied. Expo attempted automatic setup and failed on its unwritable state directory. The final project has explicit lint tooling/configuration.
- `npx jest --runInBand`: failed, no tests found.
- `npx expo-doctor`: initial attempts hit environment/cache/proxy failures. With a writable Expo directory and proxy-aware fetch, Doctor found SDK-compatible patch mismatches plus deprecated/unused dependencies (16/18 passed).

Major findings: nonexistent group-index redirects; duplicated admin/user routes; components treated as routes; transient gameplay/results in tabs; ignored player level; level-1 generation; executable formula evaluation; incorrect reduction starting at zero; entire expressions displayed; stale scoring and premature round-ten navigation; duplicate answer/reward paths; inconsistent Daily profile columns; non-deterministic choices; result navigation without required state; placeholder Progress; hardcoded deployment configuration; missing schema/RLS; incorrect README feature/setup claims.

## Initial v1 checks

Completed in the supplied Linux environment (Node 24.19.0/npm 11.9.0; CI selects Node 22 LTS):

| Command | Result |
| --- | --- |
| `npm ci --cache /tmp/taptics-npm` | Passed clean install, 1,353 packages |
| `npx tsc --noEmit` / `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings permitted |
| `npx jest --runInBand` | Passed: 6 suites, 18 tests |
| `npm run test:database` | Passed migration, award idempotency, progression validation, private reads, denied writes and cascading account deletion in PGlite/PostgreSQL |
| `npx expo-doctor` | Passed: 18/18 checks |
| `npx expo export --platform web` | Passed static web export |
| `npx expo export --platform ios --platform android --output-dir /tmp/taptics-native-export` | Passed both Hermes/native JavaScript bundles |
| `npx expo start --port 8081` (CI/offline smoke) | Metro started successfully and reported its localhost URL; deliberately stopped after the startup smoke |
| Chromium/Playwright browser smoke against the web export | Passed four tabs, fresh guest boot, ten-round scoring, result refresh idempotency, persistent Daily lock, real Progress and guest Profile; no page errors |
| `git diff --check` and repository-wide review | Passed; no executable formulas, stale destinations, implementation placeholders, hardcoded Supabase deployment values, or service credentials |

Environment-specific prefixes: `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/taptics-expo`, `npm_config_cache=/tmp/taptics-npm`, and `NODE_USE_ENV_PROXY=1` for Doctor. No dependency checks were disabled except React Native Directory metadata lookup for `seedrandom`, a pure JavaScript PRNG with no native module. SDK 52 was retained with compatible Expo/Router/native patch updates. Unused dependencies were pruned; maintained `expo-audio` replaces deprecated `expo-av` while reusing existing sound assets.

The browser smoke used Chromium with a 390×844 viewport and actual generated options; it independently counted visible correct feedback and matched the saved final score after ten accepted answers, then reloaded the stored result and Daily completion. The app's completion state is local-first. No configured Taptics backend was available in the connected Supabase project list, so production Auth/PostgREST and two-device cloud integration were not tested or deployed.

JavaScript/Hermes export does not prove a signed native binary compiles or that sound/haptics are correct on physical devices. Native signing/toolchain compatibility, deployed-account integration, store materials and device acceptance remain on `RELEASE_CHECKLIST.md`. Release classification: **development-ready**, not yet beta/TestFlight-ready or store-submission-ready.

## Final pre-merge pass

Started from `d8acaf6` on the same `codex/finish-taptics-v1` branch. The deterministic engine, completion-based progression, existing schema/atomic award RPC/RLS, navigation and offline queue were preserved. Added an explicit, reviewed guest-completion merge and durable pending/confirmed import receipts; no aggregate XP/level/streak copying and no new schema migration.

The full requested suite was rerun after the changes:

| Command | Result |
| --- | --- |
| `npm ci` | Passed clean install (1,353 packages; writable npm cache) |
| `npx expo-doctor` | Passed 18/18 checks |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npx jest --runInBand` | Passed 9 suites / 37 tests |
| `npm run test:database` | Passed expanded security regression checks |
| `npx expo export --platform web` | Passed |
| `npx expo export --platform ios --platform android --output-dir /tmp/taptics-premerge-native` | Passed both native/Hermes exports |

New tests cover new/existing-account import, explicit consent/decline, duplicate IDs/Daily dates, deterministic conflict precedence, stale review, date/prerequisite disclosures, partial upload, offline restart, lost acknowledgements, idempotent retry, foreign-owned UUID remapping, account-switch invalidation, concurrent server Daily completion, failed local persistence, cloud-confirmed wording and restoration of the unchanged guest profile on logout. RPC uploads are exercised through the provider with a controlled backend; the real migration is exercised in PostgreSQL/PGlite.

The security regression additionally confirms no actor/user parameter is accepted by either RPC, account deletion accepts no arguments, every direct client INSERT/UPDATE/DELETE is denied, Daily uniqueness holds even outside the RPC, a training UUID retry cannot change its score or XP, deleting one user preserves the other, and a deleted user's old identity cannot award new results. No client table-write path or profile/XP UPDATE was reintroduced. Anti-cheat for self-reported scores remains explicitly outside this personal-practice MVP.

Live email-confirmation/Auth/PostgREST and physical-device import acceptance still require Zach's deployed Taptics backend and devices. The release checklist now includes guest-import and interrupted-upload acceptance. Environment cache/proxy overrides are unchanged from the initial validation.
