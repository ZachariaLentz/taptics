# Supabase setup

Guest play needs no backend. The production Taptics backend and checked-in v1 migration are already deployed. For account sync, configure the two public values from `.env.example`: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Copy only the publishable key from the Connect dialog/API Keys page. Never put service-role credentials in Expo.

For a separate, new backend only, install the Supabase CLI, then from this repository:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively run `migrations/20261006162143_taptics_v1.sql` once in the project's SQL editor. Do not rerun the migration against the already-deployed production backend for this SDK upgrade. This pass changes no schema.

The migration creates `training_sessions` and `daily_completions`, adds canonical profile columns if a legacy `profiles` table exists, and replaces legacy policies on these tables. Back up existing data first. Inspect any additional required legacy profile columns or custom triggers: they must have defaults or be removed before using the RPC. The prototype did not record enough information to reconstruct historical training or Daily rewards. v1 starts completion-based totals from zero; legacy aggregate profile fields are not imported or trusted. Legacy `last_daily`, `last_daily_play`, `daily_correct`, and `is_admin` are no longer consumed. The legacy `level_config` table, if present, has client access revoked; executable formulas are not used.

Profiles are a server-maintained summary. The app calculates its view from completion history, including pending offline events. There are no client INSERT/UPDATE/DELETE table grants. RLS allows authenticated users to read only their own rows. `record_completion` gets its user from `auth.uid()`, locks awards per user, validates inputs, computes XP, and inserts atomically. Training UUIDs are unique and Daily has a unique `(user_id, played_on)` constraint. Retries cannot reward twice. Account deletion cascades through all three tables.

Enable email/password authentication, keep **Confirm email** enabled, and configure production SMTP and rate limits. Configure the exact native URLs below; no external recovery page is needed. OAuth is deliberately omitted from v1. Anonymous Supabase auth is not required: guests are local profiles.

Offline account results are queued and retry on launch, foreground, new completion, or manual Sync. The server accepts dates up to 366 days old (and one day ahead for timezone boundaries). Sync before switching accounts. A Daily completed on two offline devices is resolved to the first server submission; the other device adopts that stored result after sync. Client-reported training scores are not anti-cheat verified; there is no competitive leaderboard. Device clock changes can affect local dates. This is a personal practice MVP, not a tamper-proof rewards economy.

Guest imports do not introduce a database bypass or new migration. They reconcile completion records, queue them through `record_completion`, and preserve original IDs unless a UUID is already owned by another account. That case uses a deterministic account-specific UUID. Existing account IDs and Daily dates are retained. Date/level restrictions remain enforced by the RPC; the import review discloses ineligible records rather than rewriting dates or aggregate progress. A durable local receipt stays pending until server history confirms the import, including Daily collisions from other devices. Guest data is never deleted by migration.

## Native email confirmation and recovery

In **Authentication → URL Configuration**, set:

- **Site URL:** `taptics://auth/confirm`
- **Redirect URLs:** `taptics://auth/confirm` and `taptics://auth/recovery` (two exact entries; no wildcard required).

Keep the Confirm signup and Reset password email templates linked to `{{ .ConfirmationURL }}`. If a template was customized to use `{{ .SiteURL }}` directly, restore `{{ .ConfirmationURL }}` so Supabase verifies the email and honors each request's redirect. Disable mail-provider link tracking if it rewrites auth links. No table/RLS/RPC changes are required.

Signup sets `emailRedirectTo: taptics://auth/confirm`; reset sets `redirectTo: taptics://auth/recovery`. The client uses PKCE, AsyncStorage (including the verifier), the existing session storage key, `processLock`, native Expo-backed secure randomness/SHA-256 for PKCE, and manual callback handling (`detectSessionInUrl: false`). Request the email and open its latest link on the **same installed app/device**. A request on another device, reinstall/cleared storage, or a newer email request can invalidate the stored verifier; request a fresh email. Supabase codes are one-use and short-lived. With verification enabled, signup without confirmation does not grant a session. The confirmation callback exchanges the code and establishes the verified session; the user can then continue to Profile or log in normally.

Recovery exchanges the code, requires the SDK's `PASSWORD_RECOVERY` event for that session, and presents the new-password/confirmation form in Taptics. It verifies the current account before `updateUser({ password })`; logout/account switches revoke the transient recovery authorization. Password changes preserve the account's progress and keep guest import opt-in. Recovery authorization is intentionally not persisted; if the app is closed before saving, request a fresh reset email. Cold launch and foreground links are supported, duplicate delivery exchanges once, and invalid/expired links show an actionable error. Tokens/codes are never logged or saved in gameplay storage. AppState controls native auth refresh; offline cached account identity is a local display/cache selection, never authority for server access.

The fixed redirects target installed development/preview/production builds, not Expo Go or browser-based recovery. Web gameplay/export remains supported; this pass does not create a hosted web auth callback. Test email links on a physical iPhone after setting the URLs and installing the EAS build.

References: [React Native auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [native deep links](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [email/password](https://supabase.com/docs/guides/auth/passwords), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
