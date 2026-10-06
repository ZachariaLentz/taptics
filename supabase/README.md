# Supabase setup

Guest play needs no backend. For account sync, create a Supabase project and configure the two public values from `.env.example`. Never put service-role credentials in Expo.

Install the Supabase CLI, then from this repository:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively run `migrations/20261006162143_taptics_v1.sql` once in the project's SQL editor. No live database has been changed by this work.

The migration creates `training_sessions` and `daily_completions`, adds canonical profile columns if a legacy `profiles` table exists, and replaces legacy policies on these tables. Back up existing data first. Inspect any additional required legacy profile columns or custom triggers: they must have defaults or be removed before using the RPC. The prototype did not record enough information to reconstruct historical training or Daily rewards. v1 starts completion-based totals from zero; legacy aggregate profile fields are not imported or trusted. Legacy `last_daily`, `last_daily_play`, `daily_correct`, and `is_admin` are no longer consumed. The legacy `level_config` table, if present, has client access revoked; executable formulas are not used.

Profiles are a server-maintained summary. The app calculates its view from completion history, including pending offline events. There are no client INSERT/UPDATE/DELETE table grants. RLS allows authenticated users to read only their own rows. `record_completion` gets its user from `auth.uid()`, locks awards per user, validates inputs, computes XP, and inserts atomically. Training UUIDs are unique and Daily has a unique `(user_id, played_on)` constraint. Retries cannot reward twice. Account deletion cascades through all three tables.

Enable email/password authentication and configure SMTP, email confirmation, rate limits, a hosted password recovery page, Site URL and allowed redirect URLs. OAuth is deliberately omitted from v1. Anonymous Supabase auth is not required: guests are local profiles.

Offline account results are queued and retry on launch, foreground, new completion, or manual Sync. The server accepts dates up to 366 days old (and one day ahead for timezone boundaries). Sync before switching accounts. A Daily completed on two offline devices is resolved to the first server submission; the other device adopts that stored result after sync. Client-reported training scores are not anti-cheat verified; there is no competitive leaderboard. Device clock changes can affect local dates. This is a personal practice MVP, not a tamper-proof rewards economy.
