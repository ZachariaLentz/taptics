# Taptics

A mental-arithmetic workout app built with React Native, Expo Router, and optional Supabase account sync. Start as a guest, train through ten Flash rounds, earn XP, and return for one Daily Challenge per local calendar day.

## Run locally

Use Node.js 22 LTS and npm. The lockfile is committed.

```sh
git clone https://github.com/ZachariaLentz/taptics.git
cd taptics
git switch dev
npm ci
cp .env.example .env
npm start
```

Leave `.env` values blank for durable guest play. For account sync, configure your public Supabase URL and publishable key. The production v1 migration is already deployed; for a new backend, apply the migration using [Supabase setup](supabase/README.md). Restart Expo after changing environment values. Never use a service-role key in the client.

Use `npm run web` for a browser. This project uses stable Expo SDK 57 and React Native 0.86 with the New Architecture. Use an EAS development build for Metro or a standalone preview build for physical-device testing (iOS 16.4+). iOS development requires your Apple/EAS setup. See [release checklist](docs/RELEASE_CHECKLIST.md) for native build and store requirements.

## Product rules

- **Flash:** ten answered rounds. Terms flash individually; start with the first number and apply each operation in sequence, left to right, without normal operator precedence. Four answer options appear afterward. Answers lock immediately, followed by visible feedback, sound, and haptics where supported. Backgrounding pauses a round and lets you replay its terms.
- **Progression:** score at least 7/10 to advance one level, up to level 100. A failed workout keeps your level and can be retried. XP is `10 × correct answers + 20 if passed`. Repeated training is intentional; each finished workout has a unique completion ID.
- **Difficulty:** levels 1–2 use positive addition; subtraction begins at 3, multiplication at 6, division at 10, and decimals at 12. Term count and ranges grow; term delay decreases from 1.4 seconds to a 0.55-second floor. Division uses nonzero exact divisors, and multiplication uses bounded factors. Configuration is typed source code in `lib/flashConfig.ts`, not executable database formulas.
- **Daily:** a fixed level-4 puzzle seeded by player ID and local date, with deterministic choices. One submission per date. Correct earns 25 XP; incorrect earns 5 XP for showing up. The stored result appears on revisits.
- **Streak:** either a completed workout or a Daily attempt counts. Multiple completions on a day count once. A streak remains current through the next day and resets after a missed day.
- **Guests:** progress is local to the device. No login or backend connection is required. After authentication, Home and Profile offer an explicit guest-completion import. Review conflicts before merging; nothing is imported automatically. The original guest profile is retained, and signing out restores it. Clearing app data or uninstalling loses guest progress.
- **Accounts:** email/password sign-up and login, password-reset email, manual sync, opt-in guest import, logout, and account deletion. Email confirmation and password recovery return to native Taptics screens through PKCE deep links. OAuth and unfinished admin screens are omitted.

## Architecture

`app/` contains routes only: Home, Daily, Progress, Profile tabs; Flash, Score, Login and email callback screens in the root stack. `screens/` contains presentation. `components/ui.tsx` supplies shared visual tokens and accessible controls. `lib/engine.ts` is deterministic, independent game/progression logic. `lib/PlayerProvider.tsx` loads the persisted session, reacts to auth changes, serializes durable local saves, runs cloud retries outside the save queue, and separates each player's data. `lib/AuthProvider.tsx` handles cold/warm native email callbacks and transient recovery authorization; `lib/authCallback.ts` validates destinations and exchanges PKCE codes. `lib/storage.ts` persists completion records with AsyncStorage. `lib/guestImport.ts` plans completion merges and tracks cloud-confirmed import receipts. `supabase/migrations/` defines the reproducible backend.

Results award XP when the completed record is durably saved; Score only reads that record. Account results retry through an offline queue. Supabase award functions serialize each user's awards, compute XP, and enforce unique session IDs and Daily user/date constraints. RLS permits only private reads; direct client writes are denied. Offline Daily conflicts across devices resolve to the first server submission and reconcile on sync.

Progress displays level, XP, current streak, today's Daily status, completed workouts, total answered problems, overall accuracy, and recent completion history. It does not claim to measure speed or incomplete sessions.

## Carry guest progress into an account

After signing up (including email confirmation), or logging into an existing account, review the guest-import offer on Home/Profile. A connection is required for the initial review so existing cloud results can be shown accurately. Choose **Merge reviewed guest completions** or **Keep account progress without importing**. No XP, level or streak aggregate is copied; those values are derived from merged completion records.

Account records win matching IDs and Daily dates. Duplicate guest records resolve in a stable order. The review discloses records outside the RPC's 366-day date window and workouts missing required earlier passes; those records remain in the guest copy. Training imports upload in level order so original progression prerequisites remain valid. A guest UUID already used in a different account receives a deterministic account-specific UUID; all other completion IDs are preserved.

Confirmation durably queues the import through the existing `record_completion` RPC. If connectivity fails afterward, restart/reconnect and **Retry guest import sync**. The UI distinguishes locally queued imports from cloud-confirmed success, and a lost acknowledgement can safely retry the same UUID. Concurrent server Daily results take precedence. The guest copy is never deleted, even after success; logging out still restores it. New guest workouts can be reviewed in a later import, while already-reviewed source IDs are not awarded again. Imports are device-specific offers, not automatic cross-account copies.

## Validate

```sh
npm ci
npx expo-doctor
npx tsc --noEmit
npm run lint
npx jest --runInBand
npm run test:database
npx expo export --platform web
npx expo export --platform ios --platform android
```

Tests cover arithmetic, difficulty, deterministic puzzles and choices, ten-answer scoring, double taps, result remounts, Daily persistence/idempotency, XP, streaks, storage failures, explicit guest merges, collision handling, interrupted uploads and import retries. Database tests execute the real migration in PGlite (PostgreSQL), exercise private reads/denied writes, award idempotency, validation, and deletion. They do not replace testing a deployed Supabase Auth/PostgREST integration. GitHub Actions runs install, Expo compatibility/Doctor, typecheck, lint, app tests, database tests, and web/native exports.

For constrained environments only, npm cache and Expo state can be redirected with `npm_config_cache=/tmp/taptics-npm` and `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/taptics-expo`. `NODE_USE_ENV_PROXY=1` lets Node 24 fetch follow a configured proxy. These are environment workarounds, not required app configuration.

## Release status

See [validation notes](docs/VALIDATION.md), [feature status](docs/FEATURES.md), and [release checklist](docs/RELEASE_CHECKLIST.md). Native bundle export is not a signed native binary or a store approval. Configure email redirects on the deployed production backend and validate on actual iOS/Android devices before distributing a beta.
