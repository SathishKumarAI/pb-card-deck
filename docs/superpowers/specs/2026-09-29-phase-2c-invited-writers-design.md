# Phase 2c — invited co-organisers who can enter results

_Design spec. Written 2026-09-29. Follows
[2a](2026-09-29-supabase-accounts-and-sync-design.md) (the account and sync) and
[2b](2026-09-29-phase-2b-event-share-link-design.md) (the read-only link)._

The decision this implements, from the phase 2 brainstorm: **writers need an account
and an invite, so every result is attributable to a person and access is revocable per
person.** The viewer half shipped in 2b.

## The thing an organiser wants

A club night on eight courts. One person at a desk cannot keep up, so two friends
help. Today they shout scores across a hall at whoever holds the phone.

So: the organiser sends a **join link** to their helpers. Each helper signs in once,
the event appears in their app, and they enter scores for the matches in front of
them. The change log says **who** entered each one, and the organiser can remove a
helper in one tap.

## Non-goals

- **No new format of event, no new scoring path.** A writer uses the screens that
  already exist.
- **Writers do not own the event.** They cannot rename it, change its format, delete
  it, re-draw it, or invite anyone else.
- **No live cursors, no presence, no chat.** Two people entering different matches is
  the whole collaboration story.
- **No realtime socket.** Same reasoning as 2a and 2b: polling on the existing
  triggers, and a club night is minutes between results.

## The schema change this needs, and why it is not additive

In 2a, `tournament_matches.user_id` means "the account that owns this row", and a
trigger forces it to `auth.uid()` on insert **and update**. That was right when only
an owner could write. It is wrong the moment a helper writes: their update would
silently re-stamp the row as theirs, and the owner would lose it from their own event.

So `user_id` changes meaning to **"the account that owns the EVENT"**, and a new
column records who wrote last:

| Column | Before | After |
|---|---|---|
| `tournament_matches.user_id` | whoever wrote the row | the event's owner, derived from the parent |
| `tournament_matches.updated_by` | — | `auth.uid()` of whoever wrote last |

The trigger changes from `force_owner()` to `force_event_owner()`, which reads the
parent event's `user_id`. `event_log.actor_user_id` keeps meaning *the actor* — that is
exactly the point of an audit trail — so it stays `auth.uid()`.

**This is a migration with a behaviour change in it**, which is why it is its own
stage with its own adversarial cases rather than a column bolted onto 0004.

## Invites reuse 2b's table, deliberately

`event_shares` already holds "a hashed token that grants something about one event,
expires, and can be revoked". A writer invite is that, with `role = 'writer'`. So 2c
adds a value to the existing check constraint rather than a second table with the same
shape and a second set of policies to get wrong.

Two rules keep the two roles from blurring:

1. **`get_shared_event` only accepts a `'viewer'` token.** A writer invite is not a
   view link: holding it grants nothing until it is accepted by a signed-in account.
2. **Accepting is what creates access**, and access lives in a separate table
   (`event_members`), keyed by account. Revoking the invite stops new people joining;
   removing a *member* stops that person writing. Both are needed, and they are
   different actions.

```sql
event_members (
  tournament_id uuid references tournaments on delete cascade,
  user_id       uuid references auth.users on delete cascade,
  role          text not null default 'writer' check (role in ('writer')),
  invited_by    uuid not null references auth.users,
  created_at    timestamptz not null default now(),
  primary key (tournament_id, user_id)
)
```

**One invite link may be accepted by several people.** A desk running eight courts
sends one link to three helpers; making each helper need their own link is friction
with no security gain, because acceptance is still per account and removable per
account. The organiser sees exactly who joined.

## Who may do what

| Action | Owner | Writer (accepted member) | Viewer (token) | Stranger |
|---|---|---|---|---|
| See the event, its matches and its log | ✅ | ✅ | ✅ read-only payload | ❌ |
| Enter or correct a match score | ✅ | ✅ | ❌ | ❌ |
| Append a log line | ✅ | ✅ (as themselves) | ❌ | ❌ |
| Rename the event, change format, re-draw, delete | ✅ | ❌ | ❌ | ❌ |
| Add or delete a match row | ✅ | ❌ | ❌ | ❌ |
| Invite, revoke an invite, remove a member | ✅ | ❌ | ❌ | ❌ |
| Edit or delete a log line | ❌ | ❌ | ❌ | ❌ |

The last row is unchanged and absolute: the audit trail is append-only for everyone,
including the owner.

A writer being unable to **add** a match matters: the schedule is the engine's output,
so a helper who could insert rows could invent matches that no format produced.

## Functions

| Function | Who | Does |
|---|---|---|
| `accept_event_invite(p_token)` | `authenticated` | Validates a live `'writer'` token, inserts a membership for `auth.uid()`, returns the event id. Idempotent |
| `list_event_members(p_tournament_id)` | owner | Who has joined: display name, email, when. The owner invited them, so the owner may see them |
| `remove_event_member(p_tournament_id, p_user_id)` | owner | Deletes that membership. Immediate |
| `leave_event(p_tournament_id)` | any member | A helper can remove themselves |

`create_event_share` gains a `p_role` argument defaulting to `'viewer'`, so 2b's
callers are untouched.

## What the client has to learn

**A writer's device holds an event it does not own**, which is new. Three consequences:

1. **The pull already returns it** once membership exists, because the select policy
   allows it — no new query. But the client must record *which* events are not its own
   (the header row carries `user_id`; compare with the session) so it can:
2. **push matches and log lines, but not the header.** A writer's header upsert would
   be refused, and retrying it for ever would dead-letter the whole event. The engine
   skips the header for a shared event instead of learning that the hard way.
3. **hide what a writer cannot do.** The event screen drops rename, format, re-draw,
   delete and the invite controls, and says "shared with you by …" instead. A disabled
   button nobody can press is worse than an absent one.

Joining is a route: `/join#t=<token>`, which requires a session (offering sign-in
first if there is none), calls the RPC, then syncs.

## The security gate for this phase

New adversarial cases, all of which must fail to get in:

1. A **writer** can update a match score in the event they joined.
2. A **writer** cannot rename, re-draw or delete the event, cannot insert or delete a
   match row, and cannot delete the event's log lines.
3. A writer's update **does not re-stamp `user_id`** — the row still belongs to the
   event's owner afterwards (the regression the trigger change exists to prevent).
4. A writer's update **does** record `updated_by` as the writer.
5. A writer cannot touch a **second** event they were not invited to, including one
   belonging to the same owner.
6. A writer cannot invite anyone, list members, revoke a share, or remove a member.
7. A **removed** member immediately cannot write, and their earlier log lines survive
   — removing a person is not rewriting history.
8. A **viewer** token cannot be accepted as an invite, and a **writer** token returns
   nothing from `get_shared_event`.
9. An **expired or revoked** invite cannot be accepted.
10. `accept_event_invite` is idempotent: accepting twice leaves one membership.
11. The owner's own access is unchanged by any of the above (2a's suite still passes).

## Stages

| Stage | Contents |
|---|---|
| **2c-1** - done | `0005_event_members.sql`: the table, the trigger change, `updated_by`, the widened role check, the four functions, the policy changes; eleven adversarial cases; docs |
| **2c-2** - done | Client: the join route, the organiser's Helpers section, the writer-mode event screen, the engine's shared-event handling; tests |

As with every stage since 2a, both merge safely with no Supabase project configured:
the invite controls are absent and `/join` says links are not enabled here.
