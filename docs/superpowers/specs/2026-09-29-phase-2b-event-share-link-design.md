# Phase 2b — a read-only link to a running event

_Design spec. Written 2026-09-29. Follows
[phase 2a](2026-09-29-supabase-accounts-and-sync-design.md), which built the account
and the sync this sits on._

The decision this implements, taken with the owner in the phase 2 brainstorm:
**viewers get a public revocable read link; writers need an account and an invite.**
This spec is the viewer half. Writers are phase 2c.

## The thing a spectator wants

Someone is running a club night. Twenty people are standing around asking "am I on
next?" and "who won pool B?". Today the answer is the organiser's phone, held up.

So: the organiser taps **Share live link**, sends one URL into the group chat, and
anyone can watch the schedule, the standings and the bracket update as results land.
No signup, nothing they can change, and the organiser can kill the link.

## Non-goals, stated so they do not creep in

- **No writing.** Not a score, not a note, not a name. Phase 2c.
- **No account for viewers.** A signup wall for watching defeats the point.
- **No realtime socket.** The page polls while it is visible. A club night is minutes
  between results, not milliseconds.
- **No discovery.** There is no list of public events, no search, no index. A link is
  the only way in, and `robots.txt` keeps the page out of search results.
- **No history of who looked.** No viewer analytics, no counters per visitor.

## The security problem, and the shape that solves it

A spectator is **not authenticated**. Row-level security decides everything from
`auth.uid()`, which for them is null — so there is no policy that can say "this
anonymous person may read exactly this event". Granting `anon` any table access would
be granting it to the whole internet.

So the viewer never touches a table. **One `SECURITY DEFINER` function is the entire
anonymous surface:**

```sql
get_shared_event(p_token text) returns jsonb
```

It hashes the presented token, looks for a share row that is not revoked and not
expired, and returns a presentation-shaped JSON document: the event header, its
matches, and its change log. Nothing else in the database is reachable without a
session, and `anon` keeps zero table grants.

### The token

- **256 bits of randomness**, generated in the browser with
  `crypto.getRandomValues` and encoded base64url (43 characters).
- **Only its SHA-256 hash is stored.** A database dump yields no working links.
  Hashing happens server-side inside the definer function, so the browser needs no
  `crypto.subtle` — which is unavailable in a plain-http LAN dev session.
- **It lives in the URL fragment**, not the query string: `/shared#t=<token>`. A
  fragment is never sent to the server, so the token stays out of access logs, out of
  the `Referer` header when a viewer clicks an outbound link, and out of the Vercel
  edge logs.
- **One live share per event at a time** is the normal case, but the table allows
  several so an organiser can revoke one and issue another without losing the first
  one's audit row.
- **A bad token is indistinguishable from an expired or revoked one.** The function
  returns null for all three, so a probe learns nothing about which events exist.

### What the payload deliberately omits

The function hand-picks columns rather than returning rows, because the tables carry
things a spectator must never see:

| Omitted | Why |
|---|---|
| `user_id`, `actor_user_id` | Account identifiers, of any person |
| Any email | Not in these tables, and must not arrive via a join |
| `client_id` | A device's local id; useless to a viewer, and a fingerprint |
| Other events | The function is scoped to one `tournament_id`, always |
| `event_shares` rows | A viewer cannot enumerate or inspect links, including their own |

Player names **are** included, because a schedule without names is not a schedule.
That is a real disclosure and the privacy page has to say so plainly: sharing an
event publishes the names in it to anyone with the link.

## What the viewer sees

A read-only version of the screens the organiser already has, reusing the same
components so the shape cannot drift:

- **On now** — what is on court, with court numbers.
- **Schedule** — every match, round by round, with results.
- **Standings** — wins, head-to-head, point difference; pool tables show the
  qualifying line.
- **Bracket** — the tree, with connectors, scrolling sideways on a phone.

Plus a banner saying it is a live view, when it last refreshed, and that nothing
here can be changed. It refreshes while the tab is visible, on a 30-second interval
that pauses when hidden — a phone in a pocket must not poll.

Failure states are explicit, not blank: **link expired**, **link revoked**, **link
not found**, **offline**. Each says what to do (ask the organiser for a new link).

## What the organiser sees

In the event screen, under Share: **Share live link**.

- Creating one shows the URL **once**, with a copy button, because the token cannot be
  recovered from the hash afterwards.
- An expiry is chosen on creation: 1 day, 7 days, 30 days, or never. Default **7
  days** — a club night's link should not outlive the season by default.
- Existing links are listed with when they were made and when they expire, and each
  has **Revoke**, which takes effect on the next request.
- Copy that says what it publishes: *"anyone with this link can see the schedule,
  results and player names in this event. Nobody can change anything."*

## Data model

One new table, named in the 2a spec so this is additive:

```sql
event_shares (
  id             uuid primary key,
  tournament_id  uuid not null references tournaments on delete cascade,
  owner_user_id  uuid not null references auth.users on delete cascade,
  token_hash     text not null unique,     -- sha256 hex of the token, never the token
  role           text not null default 'viewer' check (role in ('viewer')),
  expires_at     timestamptz,              -- null = never
  revoked_at     timestamptz,
  created_at     timestamptz not null default now()
)
```

`role` exists with a single legal value so phase 2c adds `'writer'` as a check
change rather than a new table.

RLS: the owner may read and delete their own share rows; **nobody may update one**
(revoking sets `revoked_at` through a definer function, so a share's history cannot
be rewritten); `anon` gets nothing.

## Functions

| Function | Who | Does |
|---|---|---|
| `create_event_share(p_tournament_id, p_token, p_expires_at)` | `authenticated`, and only the event's owner | Hashes the token, inserts the row, returns its id |
| `revoke_event_share(p_share_id)` | `authenticated`, owner of that share | Sets `revoked_at` |
| `list_event_shares(p_tournament_id)` | `authenticated`, owner | Returns id, created, expires, revoked — **never the hash** |
| `get_shared_event(p_token)` | **`anon`** and `authenticated` | The whole viewer surface. Returns the event document, or null |

All four are `SECURITY DEFINER` with `set search_path = ''`, revoked from `public`,
and derive the caller from `auth.uid()` rather than an argument — except
`get_shared_event`, which has no caller identity by design and is authorised by the
token alone.

## The security gate for this phase

Added to the existing adversarial suites, and the same rule applies: these must fail
to get in.

1. `anon` still cannot select from any table, including `event_shares`.
2. A **valid** token returns exactly one event, and its payload contains no
   `user_id`, no `actor_user_id`, no `client_id` and no email.
3. A **revoked** token returns null. An **expired** token returns null. A **garbage**
   token returns null. All three are indistinguishable.
4. A second account cannot create a share for an event it does not own.
5. A second account cannot revoke, read or list someone else's shares.
6. Nobody can `update` an `event_shares` row — the audit trail of links is
   append-then-revoke, not editable.
7. A token for event A never returns event B.
8. Deleting the event deletes its shares (cascade), so a revoked-by-deletion link
   cannot resurrect.

## What can still go wrong, and the answer

| Risk | Answer |
|---|---|
| The link is forwarded beyond the group chat | It is a read-only view of a social sports event, expiring by default in 7 days and revocable in one tap. Stated plainly in the share dialog so the organiser decides. |
| A viewer polls aggressively | 30 s while visible, paused when hidden. The function is a single indexed lookup. Supabase's own limits apply beyond that. |
| Someone brute-forces tokens | 256 bits. At a billion guesses a second this outlives the sun. |
| The token leaks through a log | It is in the fragment, which is never sent to a server. |
| A free project pauses after 7 idle days | The viewer page says the event is unreachable and to ask the organiser — the same honest failure the sync layer already surfaces. |
| An organiser shares an event with real names and later regrets it | Revoke is immediate, and deleting the event cascades the shares. |

## Stages

| Stage | Contents |
|---|---|
| **2b-1** — done | `0004_event_shares.sql`: the table, its RLS, the four functions; adversarial cases 1-8 in both suites; `docs/SUPABASE-SETUP.md` updated |
| **2b-2** — done | `lib/share/*`: token generation, the four calls, and the read-only document type; the `/shared` route; the organiser's share panel; the privacy page; tests |

Both land before phase 2c, and neither changes anything for a deployment with no
Supabase project: with no env vars the share controls are absent and `/shared` says
the link cannot be opened here.
