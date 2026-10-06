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
await record(trainingId);
assert.equal(
  (await db.query("select * from public.training_sessions")).rows.length,
  1,
);
let profile = (await db.query("select * from public.profiles")).rows[0];
assert.equal(profile.xp, 120);
assert.equal(profile.level, 2);
assert.equal(profile.streak, 1);
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
await asUser(alice);
await db.query("select public.delete_my_account()");
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
await db.close();
console.log(
  "Database migration, atomic awards, idempotency, private reads, denied writes, progression validation and account deletion passed.",
);
