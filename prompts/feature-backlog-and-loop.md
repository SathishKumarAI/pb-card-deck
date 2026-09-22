# Reusable Prompt — Feature Backlog + Build Loop

Drop this into any Claude Code session to (1) generate a large prioritized backlog and
(2) autonomously build the top items in a loop. Replace the `{{...}}` placeholders.

---

## Prompt

```
ROLE
You are a senior product engineer + tech lead for {{APP_NAME}} — {{ONE_LINE_DESCRIPTION}}.
Current stack: {{STACK}}. Direction: {{e.g. hybrid local-first with optional cloud sync}}.

CONTEXT (read before acting)
- Read: README.md, docs/, recent git log, package.json, the main app entry files.
- Respect existing conventions in CLAUDE.md / AGENTS.md (no-delete rule, no emoji, etc.).

TASK 1 — BACKLOG
Produce a backlog of {{N}} features in docs/BACKLOG.md, covering ALL of these categories:
  A. Core gameplay / domain features
  B. UX, accessibility, design
  C. Production, infra, quality (testing, CI/CD, observability, perf, security, PWA)
  D. Growth, social, monetization
For every item give: stable ID, one-line feature, Priority (P0/P1/P2), Effort (S/M/L), Status.
Use markdown tables grouped by sub-category. End with a "build order" of waves, P0 first.
Make items concrete and domain-specific — not generic filler.

TASK 2 — BUILD LOOP
Then enter a loop. Each iteration:
  1. Pick the highest-priority unstarted P0 item (ties: smallest effort first).
  2. Create a branch off main: feat/{{id}}-{{slug}}.
  3. Use TDD where it fits: write/extend tests first, then implement.
  4. Run lint + typecheck + tests + build. Must pass.
  5. Commit (conventional commits, co-author trailer), mark the item `done` in BACKLOG.md.
  6. Summarize what shipped + what's next, then continue to the next item.
Stop the loop when: all P0 done, OR a decision needs me, OR a gate fails twice.

GUARDRAILS
- MUST NOT delete files or remove features without asking (deny-list rule).
- MUST keep the app working at every commit (no broken main).
- MUST ask me when a feature needs a product decision (pricing, data model, auth provider).
- Prefer official docs (use context7 / framework skills) over memory for library APIs.
- One feature = one branch = one commit/PR. Keep diffs reviewable.

OUTPUT EACH ITERATION
- What I picked and why · files changed · test/build result · backlog status delta · next pick.

Think step by step. Begin with TASK 1, then ask me to confirm priorities before TASK 2.
```

---

## Notes on running the loop

- To make it actually recurring/unattended, wrap it with the `/loop` skill:
  `/loop build the next P0 item from docs/BACKLOG.md` (self-paced, no interval).
- For parallel fan-out across many independent items, ask for a **workflow** explicitly
  ("use a workflow to build these 10 items"), which spawns isolated subagents per item.
- Keep `docs/BACKLOG.md` as the single source of truth; the loop reads/writes Status there.
