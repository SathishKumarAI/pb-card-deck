#!/usr/bin/env node
/**
 * Adversarial row-level-security suite — the security gate for phase 2a.
 *
 * Every case here TRIES TO BREAK IN as a second account and must fail to. It
 * talks raw HTTP to PostgREST and GoTrue rather than through supabase-js on
 * purpose: the wire is the actual attack surface, and this file then needs no
 * dependencies at all.
 *
 * It CANNOT run without a database, and when it cannot run it EXITS NON-ZERO
 * with the reason. A skipped security test that reads as a pass is how a hole
 * ships; this file refuses to be that.
 *
 * Run it against a development or staging project, never production - it creates
 * and deletes two throwaway users.
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
 *   SUPABASE_SECRET_KEY=sb_secret_...            # local only, never in CI
 *   SUPABASE_RLS_TEST=i-understand-this-creates-and-deletes-users \
 *   node supabase/tests/rls.test.mjs
 *
 * The secret key is used ONLY to create and delete the two test users. Every
 * assertion runs with a normal user session and the publishable key, exactly as
 * the browser does.
 */

const URL_ = process.env.SUPABASE_URL;
const PUBKEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONSENT = process.env.SUPABASE_RLS_TEST;

function die(why) {
  console.error(`\nRLS SUITE DID NOT RUN: ${why}`);
  console.error("This is a failure, not a skip. The security gate is unverified.\n");
  process.exit(1);
}

if (!URL_ || !PUBKEY) die("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) are required");
if (!SECRET) die("SUPABASE_SECRET_KEY is required to create the two throwaway test users");
if (CONSENT !== "i-understand-this-creates-and-deletes-users") {
  die("set SUPABASE_RLS_TEST=i-understand-this-creates-and-deletes-users, and point this at a dev project");
}

/* ─── tiny test harness ─── */
let passed = 0;
const failures = [];
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  pass  ${name}`);
  } catch (err) {
    failures.push({ name, message: err?.message ?? String(err) });
    console.log(`  FAIL  ${name}\n        ${err?.message ?? err}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* ─── HTTP ─── */
const uuid = () => crypto.randomUUID();

async function rest(path, { token, method = "GET", body, prefer, key = PUBKEY } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not json - keep the text for the message */
  }
  return { status: res.status, ok: res.ok, body: json, text };
}

async function admin(path, { method = "POST", body } = {}) {
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method,
    headers: { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: text ? JSON.parse(text) : null };
}

async function makeUser(tag) {
  const email = `rls-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = `pw-${crypto.randomUUID()}`;
  const created = await admin("admin/users", { body: { email, password, email_confirm: true } });
  if (!created.ok) die(`could not create test user (${created.status}): ${JSON.stringify(created.body)}`);
  const signedIn = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PUBKEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await signedIn.json();
  if (!session.access_token) die(`could not sign in test user: ${JSON.stringify(session)}`);
  return { id: created.body.id, email, token: session.access_token };
}

/* ─── the suite ─── */
const main = async () => {
  console.log(`\nAdversarial RLS suite against ${URL_}\n`);
  const A = await makeUser("a");
  const B = await makeUser("b");
  console.log(`  users: A=${A.id}  B=${B.id}\n`);

  // A's data. Ids are client-generated, exactly as the app does it.
  const deckId = uuid();
  const matchId = uuid();
  const eventId = uuid();
  const eventMatchId = uuid();
  const logId = uuid();

  const seed = async () => {
    const mk = async (table, row) => {
      const r = await rest(table, { token: A.token, method: "POST", body: row, prefer: "return=representation" });
      if (!r.ok) die(`seeding ${table} failed (${r.status}): ${r.text}`);
      return r.body[0];
    };
    await mk("decks", { id: deckId, user_id: A.id, name: "A's deck", cards: [] });
    await mk("matches", { id: matchId, user_id: A.id, mode: "chaos", team1_name: "A1", team2_name: "A2" });
    await mk("tournaments", { id: eventId, user_id: A.id, name: "A's event", format: "round-robin" });
    await mk("tournament_matches", {
      id: eventMatchId, tournament_id: eventId, user_id: A.id, bracket: "rr", round: 1,
    });
    await mk("event_log", {
      id: logId, tournament_id: eventId, actor_user_id: A.id, kind: "result", text: "A recorded 11-6",
    });
    await mk("prefs", { user_id: A.id, data: { favorites: [1, 2, 3] } });
  };
  await seed();
  console.log("  seeded A's rows\n");

  const TABLES = ["decks", "matches", "tournaments", "tournament_matches", "event_log", "prefs", "profiles"];

  console.log("1. a second account cannot READ another account's rows");
  for (const t of TABLES) {
    await check(`B selects ${t} → nothing of A's`, async () => {
      const r = await rest(`${t}?select=*`, { token: B.token });
      assert(r.ok, `expected a 2xx with an empty set, got ${r.status}: ${r.text}`);
      assert(Array.isArray(r.body), `expected an array, got ${r.text}`);
      const leaked = r.body.filter((row) => row.user_id === A.id || row.actor_user_id === A.id || row.id === A.id);
      assert(leaked.length === 0, `LEAK: ${leaked.length} of A's rows visible to B in ${t}`);
    });
  }

  console.log("\n2. the anonymous key cannot read anything");
  for (const t of TABLES) {
    await check(`anon selects ${t} → refused or empty`, async () => {
      const r = await rest(`${t}?select=*`, {});
      if (r.ok) {
        assert(Array.isArray(r.body) && r.body.length === 0, `LEAK: anon read ${r.body?.length} rows from ${t}`);
      } else {
        assert([401, 403, 404].includes(r.status), `unexpected status ${r.status}: ${r.text}`);
      }
    });
  }

  console.log("\n3. a second account cannot WRITE to another account's rows");
  await check("B cannot update A's deck", async () => {
    await rest(`decks?id=eq.${deckId}`, {
      token: B.token, method: "PATCH", body: { name: "owned by B now" }, prefer: "return=representation",
    });
    const asA = await rest(`decks?id=eq.${deckId}&select=name`, { token: A.token });
    assert(asA.body[0]?.name === "A's deck", `A's deck was modified by B: ${asA.text}`);
  });
  await check("B cannot delete A's match", async () => {
    await rest(`matches?id=eq.${matchId}`, { token: B.token, method: "DELETE" });
    const asA = await rest(`matches?id=eq.${matchId}&select=id`, { token: A.token });
    assert(asA.body.length === 1, "A's match was deleted by B");
  });
  await check("B cannot attach a match to A's event", async () => {
    const r = await rest("tournament_matches", {
      token: B.token, method: "POST",
      body: { id: uuid(), tournament_id: eventId, user_id: B.id, bracket: "rr", round: 9 },
      prefer: "return=representation",
    });
    assert(!r.ok, `insert against A's event succeeded as B: ${r.text}`);
    const asA = await rest(`tournament_matches?tournament_id=eq.${eventId}&select=round`, { token: A.token });
    assert(!asA.body.some((m) => m.round === 9), "B's forged match is in A's event");
  });

  console.log("\n4. ownership cannot be forged or handed over");
  await check("a row claiming another user_id is stored as the caller's", async () => {
    const id = uuid();
    const r = await rest("decks", {
      token: B.token, method: "POST",
      body: { id, user_id: A.id, name: "claims to be A's", cards: [] },
      prefer: "return=representation",
    });
    if (r.ok) {
      assert(r.body[0].user_id === B.id, `trigger did not force ownership: stored ${r.body[0].user_id}`);
      await rest(`decks?id=eq.${id}`, { token: B.token, method: "DELETE" });
    } else {
      assert([401, 403].includes(r.status), `expected a policy refusal, got ${r.status}: ${r.text}`);
    }
  });
  await check("an owner cannot transfer a row to another account", async () => {
    await rest(`decks?id=eq.${deckId}`, { token: A.token, method: "PATCH", body: { user_id: B.id } });
    const asA = await rest(`decks?id=eq.${deckId}&select=user_id`, { token: A.token });
    assert(asA.body[0]?.user_id === A.id, `ownership was transferred: ${asA.text}`);
  });

  console.log("\n5. the audit trail is append-only, even for its owner");
  await check("A cannot edit their own event_log line", async () => {
    await rest(`event_log?id=eq.${logId}`, { token: A.token, method: "PATCH", body: { text: "never happened" } });
    const r = await rest(`event_log?id=eq.${logId}&select=text`, { token: A.token });
    assert(r.body[0]?.text === "A recorded 11-6", `audit line was rewritten: ${r.text}`);
  });
  await check("A cannot delete their own event_log line", async () => {
    await rest(`event_log?id=eq.${logId}`, { token: A.token, method: "DELETE" });
    const r = await rest(`event_log?id=eq.${logId}&select=id`, { token: A.token });
    assert(r.body.length === 1, "audit line was deleted");
  });

  console.log("\n6. the server owns the clock");
  await check("a client cannot set updated_at", async () => {
    const past = "2000-01-01T00:00:00Z";
    await rest(`decks?id=eq.${deckId}`, {
      token: A.token, method: "PATCH", body: { description: "touched", updated_at: past },
    });
    const r = await rest(`decks?id=eq.${deckId}&select=updated_at`, { token: A.token });
    assert(new Date(r.body[0].updated_at).getFullYear() > 2020, `client timestamp was accepted: ${r.text}`);
  });

  console.log("\n7. delete_my_account deletes exactly one account");
  await check("A's rows go, B's stay, and A's session is dead", async () => {
    const bDeckId = uuid();
    const mkB = await rest("decks", {
      token: B.token, method: "POST", body: { id: bDeckId, user_id: B.id, name: "B's deck", cards: [] },
      prefer: "return=representation",
    });
    assert(mkB.ok, `could not seed B's deck: ${mkB.text}`);

    const rpc = await rest("rpc/delete_my_account", { token: A.token, method: "POST", body: {} });
    assert(rpc.ok, `delete_my_account failed (${rpc.status}): ${rpc.text}`);

    const bStill = await rest(`decks?id=eq.${bDeckId}&select=id`, { token: B.token });
    assert(bStill.body.length === 1, "deleting A's account removed B's deck");

    // Reading with A's now-orphaned token must not return data. Either the JWT is
    // rejected, or auth.uid() matches nothing and every policy filters to empty.
    const aAfter = await rest("decks?select=id", { token: A.token });
    if (aAfter.ok) assert(aAfter.body.length === 0, `deleted account still reads rows: ${aAfter.text}`);
  });
  await check("anon cannot call delete_my_account", async () => {
    const r = await rest("rpc/delete_my_account", { method: "POST", body: {} });
    assert(!r.ok, `anon executed delete_my_account: ${r.text}`);
  });

  /* cleanup: A deleted itself; B is ours to remove. */
  await admin(`admin/users/${B.id}`, { method: "DELETE" });

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) {
    console.error("SECURITY GATE FAILED:");
    for (const f of failures) console.error(`  - ${f.name}: ${f.message}`);
    console.error("");
    process.exit(1);
  }
  console.log("Security gate passed: no cross-account read, write, forge or rewrite.\n");
};

main().catch((err) => {
  console.error(`\nsuite crashed: ${err?.stack ?? err}\n`);
  process.exit(1);
});
