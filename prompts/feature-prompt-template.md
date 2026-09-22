# Feature Prompt Template

Copy this for every new feature. Fill the brackets, delete what doesn't apply.
The order matters: context first, behavior second, constraints third, plan before code.

---

## The prompt

```
FEATURE: [short name]

First, explore the relevant code before writing anything:
- where [the trigger / entry point] happens
- where [key data/function, e.g. lastSetFor] is defined
- how [the view/component] renders today
Then propose a plan and the files you'll change. Don't write code yet.

BEHAVIOR (acceptance criteria — "when X, then Y"):
- When [event], [result].
- When [edge condition], [result].
- When [no-data / first-time case], [show nothing / fallback].

RULES / LOGIC:
- [any decision logic the one-liner left out — be explicit here]

CONSTRAINTS:
- Follow the existing [pattern/component/state convention].
- Use [library already in the project], don't add new deps without asking.
- Do NOT touch [files/areas that should stay untouched].

DONE WHEN:
- Logic is unit-tested, including [edge case 1] and [edge case 2].
- [Renders / behaves] as described.
- I can verify by [steps].
```

---

## Why each block is there

- **Explore + plan before code** — catches wrong assumptions cheaply, before code exists.
- **Acceptance criteria, not prose** — "when X then Y" is hard to misinterpret.
- **Rules/logic** — the one-line backlog item almost never specifies *which* branch fires *when*. This is the real work; decide it before you build.
- **Constraints** — keeps the change consistent with the codebase instead of a stylistic island.
- **Done when** — defines verification so "done" isn't a guess.

## Tips
- Paste the actual backlog line at the top so nothing gets lost in translation.
- For anything non-trivial, keep "don't write code yet" in — review the plan, then say "go".
- If it spans many files or you're unsure of scope, ask it to break the work into steps and do them one at a time, verifying each.

## See also
- [`feature-backlog-and-loop.md`](feature-backlog-and-loop.md) — generate the backlog + run the autonomous build loop.
- [`../docs/BACKLOG.md`](../docs/BACKLOG.md) — the 500-item backlog these prompts feed from.
