# Validation and audit

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
