# Sharing an event

Three roles, one event. This is the user-facing guide; the design and its security
reasoning are in the
[2b](superpowers/specs/2026-09-29-phase-2b-event-share-link-design.md) and
[2c](superpowers/specs/2026-09-29-phase-2c-invited-writers-design.md) specs.

| Role | Gets in by | Can | Cannot |
|---|---|---|---|
| **Organiser** | created the event | everything | — |
| **Helper** | an **invite link**, then signs in | enter and correct scores | rename, re-draw, delete, invite, or see your other events |
| **Spectator** | a **live link**, no signup | watch the schedule, standings and bracket | change anything at all |

Sharing needs an account, because a link has to live somewhere other than one phone.
Everything else in the app still works with no account at all.

---

## Spectators: the live link

**Event screen → `Live link`.**

1. Choose how long it lasts: 1 day, 7 days, 30 days, or never. **7 days is the
   default** — a club night's link should not outlive the season.
2. The URL appears **once**, with a copy button. Paste it into the group chat.
3. Anyone who opens it sees the schedule, what is on court, standings and the bracket,
   refreshing while they watch.

**What it publishes:** that event's schedule, results and **the player names in it**.
Nothing else — not your other events, not your account, not anyone's email. Share it
where those players would expect it to go.

**Killing a link:** `Live link` → **Revoke**. It stops working on the next request.
Deleting the event removes its links too.

**Why you only see the URL once:** only a fingerprint of it is stored, never the link
itself, so nobody — including whoever runs the database — can look up a working link
later. If you lose one, revoke it and make another.

---

## Helpers: entering scores on someone else's event

**Event screen → `Live link` → `Invite a helper`.**

1. An invite URL appears once. It lasts **one day** by default, deliberately shorter
   than a spectator link, because it grants the ability to change scores.
2. Send it to the people running your desk. One invite can be used by **several**
   people — a desk on eight courts usually has two or three helpers.
3. Each helper opens it, signs in (Google or an emailed link — no passwords), and the
   event appears in their app under **Tournaments**, marked `SHARED`.

**What a helper can do:** enter and correct scores, and that is the point. Every score
they enter is written into the change log **under their name**.

**What a helper cannot do:** rename the event, change its format, add rounds, re-draw
it, delete it, delete a match, edit the change log, invite anybody else, or see any of
your other events. Those controls are not disabled for them — they are absent.

**Two different ways to stop a helper**, and you usually want both at the end of an
event:

| Action | Effect |
|---|---|
| **Revoke** the invite link | Nobody new can join. Anyone already in stays in |
| **Remove** a helper (their row under Helpers) | That person stops immediately |

Removing a helper does **not** erase what they did: scores they entered stay, and their
lines in the change log stay. Removing a person is not rewriting history.

A helper can also leave by themselves — the `Leave` button on the event they were
shared into.

---

## What happens on a bad connection

Nothing stops. A helper's score entry writes to their own device first and syncs
afterwards, exactly like the organiser's; the chip says `Synced`, `2 to save` or
`Offline` so nobody has to guess. A spectator's page says it is offline rather than
showing a stale bracket as if it were live.

If a link stops working, the page says so plainly — expired, revoked, or unknown —
because the app genuinely cannot tell which, and guessing would be a lie. The answer is
always the same: ask the organiser for a new one.

---

## Things worth knowing before you share

- **A link is as private as the chat you put it in.** There is no password on a
  spectator link. That is the trade for "no signup", it expires by default, and revoke
  is one tap.
- **Player names travel.** Both kinds of link carry the names in that event. First names
  or nicknames are usually plenty.
- **A helper needs an account, deliberately.** That is what makes "who entered this
  score?" answerable.
- **Nothing is discoverable.** There is no public list of events, no search, and both
  `/shared` and `/join` are excluded from search engines.
- **Your other events are never included.** A link is scoped to one event, in the
  database, not in the app.

## If something looks wrong

| Symptom | Likely cause |
|---|---|
| "This link no longer works" | Expired, revoked, or the event was deleted. Ask for a new one |
| "This link is incomplete" | The part after `#` was cut off when it was copied — send the whole URL |
| A helper signed in but sees no event | They opened the invite on a different device than the one they signed in on; open the invite again on this one |
| "Invites are not enabled here" | That deployment has no account service connected — see [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) |
| A helper's score did not appear | Their device is offline or still syncing; their chip will say which |
| Sync errors after a quiet week | A free Supabase project pauses after 7 idle days. Resume it in the dashboard |
