import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated,anon;
  grant execute on function auth.uid() to authenticated,anon;
`);
const migration = (
  await readdir(new URL("../supabase/migrations/", import.meta.url))
).find((name) => name.endsWith("_taptics_v1.sql"));
await db.exec(
  await readFile(
    new URL(`../supabase/migrations/${migration}`, import.meta.url),
    "utf8",
  ),
);
const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
async function asUser(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
const today = (await db.query("select current_date::text as date")).rows[0]
  .date;
const stamp = new Date().toISOString();
const trainingId = "10000000-0000-4000-8000-000000000001";
async function record(
  id,
  kind = "training",
  correct = 10,
  date = today,
  level = 1,
  selected = null,
  puzzle = null,
) {
  await db.query("select public.record_completion($1,$2,$3,$4,$5,$6,$7,$8)", [
    id,
    kind,
    date,
    level,
    correct,
    stamp,
    selected,
    puzzle,
  ]);
}
await asUser(alice);
await record(trainingId);
// A replay cannot change the original score or award another reward.
await record(trainingId, "training", 0);
assert.equal(
  (await db.query("select * from public.training_sessions")).rows.length,
  1,
);
let profile = (await db.query("select * from public.profiles")).rows[0];
assert.equal(profile.xp, 120);
assert.equal(profile.level, 2);
assert.equal(profile.streak, 1);
assert.equal(
  (await db.query("select correct, user_id from public.training_sessions"))
    .rows[0].correct,
  10,
);
assert.equal(
  (await db.query("select user_id from public.training_sessions")).rows[0]
    .user_id,
  alice,
);
await assert.rejects(
  record("10000000-0000-4000-8000-000000000003", "training", 10, today, 3),
  /Invalid training result/,
);
await assert.rejects(
  record("10000000-0000-4000-8000-000000000004", "training", 11),
  /Invalid training result/,
);
const puzzle = {
  answer: 3,
  choices: [1, 2, 3, 4],
  terms: [
    { op: "+", value: 1 },
    { op: "+", value: 2 },
  ],
};
await record(
  "20000000-0000-4000-8000-000000000001",
  "daily",
  1,
  today,
  4,
  3,
  puzzle,
);
await record(
  "20000000-0000-4000-8000-000000000002",
  "daily",
  0,
  today,
  4,
  2,
  puzzle,
);
assert.equal(
  (await db.query("select * from public.daily_completions")).rows.length,
  1,
);
assert.equal(
  (await db.query("select xp from public.profiles")).rows[0].xp,
  145,
);
await assert.rejects(
  db.query("update public.profiles set xp=99999"),
  /permission denied/,
);
await assert.rejects(
  db.query(
    "insert into public.training_sessions(id,user_id,played_on,level,correct) values ($1,$2,$3,1,10)",
    ["30000000-0000-4000-8000-000000000001", bob, today],
  ),
  /permission denied/,
);
// No actor parameter can be supplied to either public mutation RPC.
const args = (
  await db.query(
    "select proname, pronargs, proargnames from pg_proc where pronamespace='public'::regnamespace and proname in ('record_completion','delete_my_account')",
  )
).rows;
assert.equal(
  args.find((row) => row.proname === "delete_my_account").pronargs,
  0,
);
assert.equal(
  args.find((row) => row.proname === "record_completion").pronargs,
  8,
);
assert.ok(
  !args
    .find((row) => row.proname === "record_completion")
    .proargnames.some((name) => /user|actor/.test(name)),
);
await assert.rejects(
  db.query("select public.delete_my_account($1::uuid)", [bob]),
  /does not exist/,
);
for (const table of ["profiles", "training_sessions", "daily_completions"]) {
  for (const statement of [
    `update public.${table} set ${table === "profiles" ? "xp=99999" : "user_id=user_id"}`,
    `delete from public.${table}`,
  ]) {
    await assert.rejects(db.query(statement), /permission denied/);
  }
}
await assert.rejects(
  db.query("insert into public.profiles(id,xp) values ($1,99999)", [bob]),
  /permission denied/,
);
await assert.rejects(
  db.query(
    "insert into public.daily_completions(id,user_id,played_on,correct,selected,puzzle) values ($1,$2,$3,true,3,$4)",
    ["30000000-0000-4000-8000-000000000002", bob, today, puzzle],
  ),
  /permission denied/,
);
await db.exec("reset role");
// Verify the Daily constraint independently of RPC serialization, even for a database owner.
await assert.rejects(
  db.query(
    "insert into public.daily_completions(id,user_id,played_on,correct,selected,puzzle) values ($1,$2,$3,true,3,$4)",
    ["30000000-0000-4000-8000-000000000003", alice, today, puzzle],
  ),
  /duplicate key/,
);
await asUser(bob);
assert.equal((await db.query("select * from public.profiles")).rows.length, 0);
assert.equal(
  (await db.query("select * from public.training_sessions")).rows.length,
  0,
);
assert.equal(
  (await db.query("select * from public.daily_completions")).rows.length,
  0,
);
await record("10000000-0000-4000-8000-000000000002", "training", 6);
assert.equal((await db.query("select xp from public.profiles")).rows[0].xp, 60);
await db.exec("reset role; set role anon");
await assert.rejects(
  record("10000000-0000-4000-8000-000000000005"),
  /permission denied/,
);
await assert.rejects(
  db.query("select public.delete_my_account()"),
  /permission denied/,
);
await asUser(alice);
await db.query("select public.delete_my_account()");
await assert.rejects(
  record("10000000-0000-4000-8000-000000000009"),
  /Authentication required/,
);
assert.equal(
  (await db.query("select * from public.training_sessions")).rows.length,
  0,
);
await db.exec("reset role");
assert.equal(
  (await db.query("select * from auth.users where id=$1", [alice])).rows.length,
  0,
);
assert.equal(
  (
    await db.query("select * from public.daily_completions where user_id=$1", [
      alice,
    ])
  ).rows.length,
  0,
);
assert.equal(
  (await db.query("select * from auth.users where id=$1", [bob])).rows.length,
  1,
);
assert.equal(
  (
    await db.query(
      "select correct from public.training_sessions where user_id=$1",
      [bob],
    )
  ).rows[0].correct,
  6,
);
await db.close();
console.log(
  "Database migration, atomic awards, idempotency, private reads, denied writes, progression validation and account deletion passed.",
);
