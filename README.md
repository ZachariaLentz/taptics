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

Leave `.env` values blank for durable guest play. For account sync, configure your public Supabase URL and anon key and apply the migration using [Supabase setup](supabase/README.md). Restart Expo after changing environment values. Never use a service-role key in the client.

Use `npm run web` for a browser. This project retains Expo SDK 52 with compatible patch updates; current store Expo Go clients may not support this SDK. Use an SDK-compatible Android Expo Go build or a native development build. iOS physical-device development generally needs your Apple/EAS setup. See [release checklist](docs/RELEASE_CHECKLIST.md) for native build and store requirements.

## Product rules

- **Flash:** ten answered rounds. Terms flash individually; start with the first number and apply each operation in sequence, left to right, without normal operator precedence. Four answer options appear afterward. Answers lock immediately, followed by visible feedback, sound, and haptics where supported. Backgrounding pauses a round and lets you replay its terms.
- **Progression:** score at least 7/10 to advance one level, up to level 100. A failed workout keeps your level and can be retried. XP is `10 × correct answers + 20 if passed`. Repeated training is intentional; each finished workout has a unique completion ID.
- **Difficulty:** levels 1–2 use positive addition; subtraction begins at 3, multiplication at 6, division at 10, and decimals at 12. Term count and ranges grow; term delay decreases from 1.4 seconds to a 0.55-second floor. Division uses nonzero exact divisors, and multiplication uses bounded factors. Configuration is typed source code in `lib/flashConfig.ts`, not executable database formulas.
- **Daily:** a fixed level-4 puzzle seeded by player ID and local date, with deterministic choices. One submission per date. Correct earns 25 XP; incorrect earns 5 XP for showing up. The stored result appears on revisits.
- **Streak:** either a completed workout or a Daily attempt counts. Multiple completions on a day count once. A streak remains current through the next day and resets after a missed day.
- **Guests:** progress is local to the device. No login or backend connection is required. Guest and signed-in progress are separate, and signing out restores the guest profile. Clearing app data or uninstalling loses guest progress.
- **Accounts:** email/password sign-up and login, password-reset email, manual sync, logout, and account deletion. A configured hosted password-recovery page is required. OAuth and unfinished admin screens are omitted.

## Architecture

`app/` contains routes only: Home, Daily, Progress, Profile tabs; Flash, Score, and Login in the root stack. `screens/` contains presentation. `components/ui.tsx` supplies shared visual tokens and accessible controls. `lib/engine.ts` is deterministic, independent game/progression logic. `lib/PlayerProvider.tsx` initializes the session once, serializes durable saves and cloud sync, and separates each player's data. `lib/storage.ts` persists completion records with AsyncStorage. `supabase/migrations/` defines the reproducible backend.

Results award XP when the completed record is durably saved; Score only reads that record. Account results retry through an offline queue. Supabase award functions serialize each user's awards, compute XP, and enforce unique session IDs and Daily user/date constraints. RLS permits only private reads; direct client writes are denied. Offline Daily conflicts across devices resolve to the first server submission and reconcile on sync.

Progress displays level, XP, current streak, today's Daily status, completed workouts, total answered problems, overall accuracy, and recent completion history. It does not claim to measure speed or incomplete sessions.

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

Tests cover arithmetic, difficulty, deterministic puzzles and choices, ten-answer scoring, double taps, result remounts, Daily persistence/idempotency, XP, streaks, and storage failures. Database tests execute the real migration in PGlite (PostgreSQL), exercise private reads/denied writes, award idempotency, validation, and deletion. They do not replace testing a deployed Supabase Auth/PostgREST integration. GitHub Actions runs install, typecheck, lint, app tests, database tests, and web export.

For constrained environments only, npm cache and Expo state can be redirected with `npm_config_cache=/tmp/taptics-npm` and `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/taptics-expo`. `NODE_USE_ENV_PROXY=1` lets Node 24 fetch follow a configured proxy. These are environment workarounds, not required app configuration.

## Release status

See [validation notes](docs/VALIDATION.md), [feature status](docs/FEATURES.md), and [release checklist](docs/RELEASE_CHECKLIST.md). Native bundle export is not a signed native binary or a store approval. Configure the production backend and validate on actual iOS/Android devices before distributing a beta.
