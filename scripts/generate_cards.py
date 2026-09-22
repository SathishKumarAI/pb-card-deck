#!/usr/bin/env python3
"""Build the 1729-card deck (the Ramanujan taxicab number) with rich metadata
and a playful, sports-commentator voice.

- Keeps the original 200 hand-written cards (ids 1-200), enriching them with the
  new metadata fields so the schema is uniform across the whole deck.
- Appends combinatorial twist cards in commentator voice until the deck hits
  exactly 1729, balanced round-robin across the 10 categories.
- Uniqueness is enforced like a primary key on `name` (case-insensitive).

Outputs:
  app/public/cards.json   - flat array the app fetches (now metadata-rich)
  data/cards.json         - mirror of the above
  docs/data/cards.json    - full dataset: { meta: {...why...}, cards: [...] }
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "app", "public", "cards.json")
DATA = os.path.join(ROOT, "data", "cards.json")
DOCS_DATA = os.path.join(ROOT, "docs", "data", "cards.json")
TARGET = 1729

# Base off the canonical original 200 (ids 1-200 never change), stripped back to
# core fields - so this script is idempotent no matter what's currently on disk.
CORE = ("id", "category", "name", "effect", "vibe")
loaded = json.load(open(PUB, encoding="utf-8"))
existing = [{k: c[k] for k in CORE} for c in loaded if c["id"] <= 200]
assert len(existing) == 200, f"expected 200 base cards, found {len(existing)}"
seen = {c["name"].strip().lower() for c in existing}
max_id = max(c["id"] for c in existing)


def cap(s):
    return s[0].upper() + s[1:] if s else s


def sing(s):
    return s[:-1] if s.endswith("s") else s


def art(word):
    return "an" if word[:1].lower() in "aeiou" else "a"


def vlabel(v):
    parts = v.split()
    if parts and parts[0] in ("a", "an"):
        parts = parts[1:]
    return " ".join(w.capitalize() for w in parts)


def slug(s):
    return "".join(ch if ch.isalnum() else "-" for ch in s.lower()).strip("-").replace("--", "-")


# Short hype shouts - playful flavour that rides along with both text styles.
CALLOUTS = ["Paddle up!", "Let's go!", "Boom!", "Game on!", "Soft hands!", "Send it!",
            "Here we go!", "Big point!", "Showtime!", "Dial it in!", "Money!", "Clutch time!"]
# Commentator wrappers - used to build the longer "Commentator" text style. The
# card stores BOTH a concise `effect` and a `commentary` string; a Settings
# toggle picks which one shows, so no content is lost either way.
HOOKS = ["Ohhh, here we go!", "Folks, strap in -", "Now THIS is pickleball!",
         "Big twist on the flip!", "Crowd's on their feet -", "Spicy one here -",
         "Hold onto your visors!", "And the card turns over...", "Mercy, what a draw!",
         "You love to see it -", "Dial in, dial in!", "Here comes the curveball -",
         "Oh, the deck is COOKING -", "Stop the presses, folks -", "Well would you look at that!",
         "The card gods have spoken -", "This one's got teeth -", "Buckle up, buttercup -",
         "We have got ourselves a game -", "Saints alive, what a flip!"]
STINGERS = ["Let's see who's got it!", "Pressure's ON.", "This is where legends are made.",
            "Don't blink!", "Paddle up!", "The crowd goes wild!", "Ice in the veins now.",
            "Make it count!", "Showtime, baby.", "Glory awaits!", "No guts, no glory!",
            "Win it for the highlight reel!", "Heroes only past this point.",
            "Cometh the moment, cometh the dink.", "History is one rally away.",
            "Leave it all on the court!", "This is the good stuff.", "Nerves of steel required."]
# Mid-phrases drop in occasionally to break the hook/rule/stinger rhythm.
MIDS = ["", "", "", " The tension is unreal -", " You can feel the momentum shift -",
        " And the crowd holds its breath -", " This is must-see pickleball -"]
RARITY_BANDS = {1: "common", 2: "common", 3: "uncommon", 4: "rare", 5: "legendary"}


def voiceify(i, rule):
    rule = rule.rstrip()
    mid = MIDS[i % len(MIDS)]
    line = f"{HOOKS[i % len(HOOKS)]} {rule}{mid} {STINGERS[(i // 3) % len(STINGERS)]}"
    return " ".join(line.split())


# ── richer "detail" description: how the card plays + a short tip ──────
# Two sentences per card (a category-specific read of the card + a universal
# nudge), picked deterministically by id so the same card always reads the same.
DETAILS = {
    "Shot Restriction": [
        "Strips your power game down to touch and placement.",
        "Whoever stays patient under the limit usually takes the rally.",
        "Turns a firefight into a chess match at the kitchen line.",
        "Tempting to break the rule - resist, and the point is yours.",
        "Great for grooving clean contact when rallies get loose.",
        "Sloppy paddles get punished; controlled ones get rewarded.",
    ],
    "Body & Movement": [
        "A coordination tax - move right and the shot takes care of itself.",
        "Keeps your feet alive and your base low.",
        "Awkward on the first rally, automatic by the third.",
        "Tests balance as much as hands.",
        "Footwork wins this one quietly.",
        "Stay athletic; lazy stances leak points.",
    ],
    "Wild Card / Swap": [
        "A shake-up that rewards whoever adapts fastest.",
        "Comfort zones gone - improvise and read the play.",
        "Talk to your partner; coordination is everything now.",
        "Chaos with a purpose: react first, think second.",
        "New rules, same court - adjust on the fly.",
        "The team that adapts steals the rally.",
    ],
    "Penalty": [
        "The cost of the last point comes due - dig in.",
        "Climb out of the hole with smart, safe shots.",
        "Pressure's real; calm hands beat hero balls.",
        "A setback, not a sentence - one rally at a time.",
        "Defense first until you've clawed it back.",
        "Make them earn it even while you're down.",
    ],
    "Bonus / Reward": [
        "Risk it for the biscuit - the payoff is real.",
        "Pick your spot and go for the highlight.",
        "Double the reward, double the focus.",
        "Swing for it, but don't force a low-percentage ball.",
        "This is where leads get built in a hurry.",
        "Style and points in the very same shot.",
    ],
    "Social & Party": [
        "Half the fun is the performance - commit to the bit.",
        "Loosen up; the laughter is the real score here.",
        "Character work that keeps the whole court grinning.",
        "The more you lean in, the better it plays.",
        "Low stakes, high giggles.",
        "Bring the energy - your audience of four loves it.",
    ],
    "Strategy / Skill": [
        "Targets your shot selection, not just your swing.",
        "Rewards a plan over raw pace.",
        "Find the pattern, then exploit the pattern.",
        "Patience and placement carry this one.",
        "Think two shots ahead and you'll own it.",
        "Discipline beats firepower here.",
    ],
    "Wacky / Chaos": [
        "Anything goes - ride the wave and laugh.",
        "Pure unpredictability; adapt or get dunked on.",
        "No script, all vibes.",
        "Expect the ridiculous and roll with it.",
        "The wilder you commit, the better it plays.",
        "Order is overrated for one glorious rally.",
    ],
    "Court / Environment": [
        "Set the scene and play the conditions.",
        "The court just changed - adjust your geometry.",
        "Use the safe zone; respect the danger zone.",
        "Spatial awareness is the whole game now.",
        "Read the shrinking court and pick your lanes.",
        "Conditions reward the adaptable.",
    ],
    "Meta & Game-Flow": [
        "Stakes spike - this rally can rewrite the scoreboard.",
        "Win it and you swing the whole game.",
        "Sudden-drama mode; nerves are the real opponent.",
        "Big moment - ice in the veins.",
        "One rally to rule them all.",
        "High variance, high glory.",
    ],
}
TAILS = ["Keep it safe and keep it fun.", "Talk to your partner.",
         "Commit fully - half-measures lose.", "Breathe, reset, attack.",
         "Make the next ball your best ball.", "Stay loose, stay sharp.",
         "Respect the rally, then take it.", "Have fun out there."]


def detail(category, i):
    pool = DETAILS.get(category, ["A twist that keeps everyone honest."])
    return f"{pool[i % len(pool)]} {TAILS[(i // len(pool)) % len(TAILS)]}"


# ── word banks ────────────────────────────────────────────────────────
SHOTS = ["dinks", "drives", "lobs", "volleys", "drops", "groundstrokes",
         "backhands", "forehands", "slices", "topspin shots", "punch volleys",
         "third-shot drops", "resets", "speed-ups", "ernes", "overheads"]
HANDS = ["your non-dominant hand", "your dominant hand only", "two hands on the paddle",
         "a pancake grip", "the paddle held upside-down", "a continental grip",
         "the paddle in your fingertips", "a choked-up grip"]
MOVES = ["hop on one foot", "spin once", "tap the baseline", "freeze for a beat",
         "side-shuffle", "do a squat", "touch the net post", "march in place",
         "lunge", "back-pedal a step", "high-step", "shadow a practice swing"]
WHO = ["your partner", "an opponent", "the player to your left", "the server",
       "the returner", "the closest opponent", "the other team"]
ZONES = ["kitchen", "right service box", "left service box", "transition zone",
         "backhand corner", "forehand corner", "no-volley line", "baseline strip",
         "centre line", "sideline alley"]
ADJ = ["legendary", "ridiculous", "fearsome", "humble", "dramatic", "mysterious",
       "royal", "feral", "cosmic", "retro", "thunderous", "velvet",
       "rogue", "turbo", "phantom", "sneaky"]
VOICES = ["a sports commentator", "a pirate", "a robot", "a nature documentary host",
          "an opera singer", "a news anchor", "a hype DJ", "a wrestling announcer",
          "a meditation guide", "a game-show host"]
DUR = ["this point", "this rally", "until the next side-out", "for the next 2 points",
       "until your team loses a rally", "for the rest of this game"]
WINDS = ["a fierce headwind", "a swirling crosswind", "blinding sun", "a slick surface",
         "a slow ball", "a lively ball", "a roaring crowd", "a wobbly net"]
NUMS = [1, 2, 3]
LONG = {"for the rest of this game", "until your team loses a rally"}

# Each generator yields a raw dict: name, rule (plain instruction), vibe,
# intensity (1-5 base), tags, special(bool -> bumps rarity to legendary).


def restriction():
    for s in SHOTS:
        for d in DUR:
            inten = 2 + (1 if d in LONG else 0)
            yield dict(name=f"{cap(s)} Only ({cap(d)})",
                       rule=f"{cap(s)} only. Anything else loses the rally.",
                       vibe="Lock it in", intensity=inten, tags=["control", slug(s)], special=False)
            yield dict(name=f"No {cap(s)} ({cap(d)})",
                       rule=f"No {s}. Hit one, lose the rally.",
                       vibe="Forbidden shot", intensity=inten, tags=["control", slug(s)], special=False)
    for s in SHOTS:
        yield dict(name=f"First Shot Must Be {cap(art(sing(s)))} {cap(sing(s))}",
                   rule=f"Open every rally with {art(sing(s))} {sing(s)}.",
                   vibe="Set the tone", intensity=2, tags=["control", slug(s)], special=False)
        yield dict(name=f"Finish With {cap(art(sing(s)))} {cap(sing(s))}",
                   rule=f"Only {art(sing(s))} {sing(s)} can win the rally.",
                   vibe="Closer", intensity=3, tags=["control", "finisher", slug(s)], special=False)


def body():
    for h in HANDS:
        for d in DUR:
            yield dict(name=f"Play With {cap(h)} ({cap(d)})",
                       rule=f"{cap(h)} only.",
                       vibe="Awkward grip", intensity=2 + (1 if d in LONG else 0),
                       tags=["body", "grip"], special=False)
    for m in MOVES:
        for d in DUR[:4]:
            yield dict(name=f"{cap(m)} Drill ({cap(d)})",
                       rule=f"{cap(m)} between every shot.",
                       vibe="Keep moving", intensity=3, tags=["body", "movement"], special=False)
    for m in MOVES:
        yield dict(name=f"Serve Ritual: {cap(m)}",
                   rule=f"Server must {m} right after serving.",
                   vibe="Ritual serve", intensity=2, tags=["body", "serve"], special=False)
    rules = ["keep both feet behind the baseline until you've struck the ball",
             "never let your paddle drop below your waist",
             "keep your off-hand glued to your hip the whole point",
             "stay in a low athletic crouch until contact",
             "call your own footwork out loud on every shot",
             "keep your paddle tip pointed at the sky between shots"]
    short = ["Feet behind the baseline till you hit.", "Paddle never drops below your waist.",
             "Off-hand stays on your hip.", "Stay low till contact.",
             "Call your footwork out loud.", "Paddle tip points skyward between shots."]
    for r, sh in zip(rules, short):
        for d in DUR[:3]:
            yield dict(name=f"Body Rule: {cap(r.split()[0])}... ({cap(d)})",
                       rule=sh,
                       vibe="Discipline", intensity=2, tags=["body", "discipline"], special=False)


def swap():
    for w in WHO:
        for d in DUR:
            yield dict(name=f"Swap Paddles With {cap(w)} ({cap(d)})",
                       rule=f"Trade paddles with {w}.",
                       vibe="Paddle shuffle", intensity=3, tags=["swap", "chaos"], special=False)
    for z in ZONES:
        for d in DUR:
            yield dict(name=f"Claim the {cap(z)} ({cap(d)})",
                       rule=f"Your team owns the {z} - only you play balls there.",
                       vibe="Territory grab", intensity=3, tags=["swap", "territory", slug(z)], special=False)
    for w in WHO:
        for d in DUR:
            yield dict(name=f"Mirror {cap(w)} ({cap(d)})",
                       rule=f"Copy {w}'s last shot type, or lose the rally.",
                       vibe="Copycat", intensity=3, tags=["swap", "mirror"], special=False)


def penalty():
    for h in HANDS:
        for d in DUR:
            yield dict(name=f"Penalty Grip: {cap(h)} ({cap(d)})",
                       rule=f"Penalty: play with {h}.",
                       vibe="Pay up", intensity=4, tags=["penalty", "grip"], special=False)
    for s in SHOTS:
        for d in DUR[:3]:
            yield dict(name=f"Penalty Ban: {cap(s)} ({cap(d)})",
                       rule=f"Penalty: no {s} allowed.",
                       vibe="Restricted", intensity=4, tags=["penalty", slug(s)], special=False)
    for z in ZONES:
        for d in DUR[:3]:
            yield dict(name=f"Penalty Zone: {cap(z)} ({cap(d)})",
                       rule=f"Penalty: balls in the {z} lose the rally.",
                       vibe="No-go zone", intensity=4, tags=["penalty", slug(z)], special=False)
    for n in NUMS:
        yield dict(name=f"Docked {n} Point{'s' if n > 1 else ''}",
                   rule=f"Lose {n} point{'s' if n > 1 else ''} now.",
                   vibe="Ouch", intensity=5, tags=["penalty", "score"], special=False)
        yield dict(name=f"Spot the Opponent {n}",
                   rule=f"Opponents start the next rally up {n}.",
                   vibe="Handicap", intensity=5, tags=["penalty", "score"], special=False)


def bonus():
    for s in SHOTS:
        for z in ZONES:
            yield dict(name=f"Bonus: {cap(sing(s))} to the {cap(z)}",
                       rule=f"Win with {art(sing(s))} {sing(s)} to the {z} = double.",
                       vibe="Aim true", intensity=3, tags=["bonus", slug(s), slug(z)], special=False)
    for n in NUMS:
        yield dict(name=f"Win This Rally = {n + 1} Points",
                   rule=f"Win this rally for {n + 1} points.",
                   vibe="Jackpot", intensity=4, tags=["bonus", "score"], special=(n >= 2))
    achieve = ["win the rally with a dink", "end the rally at the net", "win in under four shots",
               "force an opponent error", "win with a lob", "win with an overhead",
               "land a third-shot drop", "win right after a let"]
    for a in achieve:
        yield dict(name=f"Bonus Dare: {cap(a)}",
                   rule=f"{cap(a)} = double points.",
                   vibe="Style points", intensity=3, tags=["bonus", "dare"], special=False)


def social():
    for a in ADJ:
        for v in VOICES:
            yield dict(name=f"{cap(a)} {vlabel(v)}",
                       rule=f"Talk like {v} till the rally ends.",
                       vibe="Character work", intensity=1, tags=["social", "voice"], special=False)
    for a in ADJ:
        yield dict(name=f"Earn a {cap(a)} Team Name",
                   rule=f"Give your team {art(a)} {a} name.",
                   vibe="Brand yourselves", intensity=1, tags=["social", "team"], special=False)


def strategy():
    for s in SHOTS:
        for z in ZONES:
            yield dict(name=f"Target the {cap(z)} With {cap(sing(s))}s",
                       rule=f"Every {sing(s)} must hit the {z}.",
                       vibe="Pinpoint", intensity=2, tags=["strategy", slug(s), slug(z)], special=False)
    for z in ZONES:
        yield dict(name=f"Avoid the {cap(z)}",
                   rule=f"Land in the {z} and you lose the rally.",
                   vibe="No-go zone", intensity=2, tags=["strategy", slug(z)], special=False)
    for n in [3, 4, 5, 6]:
        yield dict(name=f"Patience: {n}-Shot Minimum",
                   rule=f"No winners before shot {n}.",
                   vibe="Build it", intensity=2, tags=["strategy", "patience"], special=False)


def chaos():
    for a in ADJ:
        for v in VOICES:
            yield dict(name=f"{cap(a)} {vlabel(v)} Mode",
                       rule=f"Act {a}; narrate like {v}.",
                       vibe="Pure chaos", intensity=3, tags=["chaos", "voice"], special=(a in ("cosmic", "phantom")))
    silly = ["with your eyes half-closed", "while humming a tune", "switching paddle hands each shot",
             "tip-toeing only", "with one hand behind your back", "announcing colours each hit",
             "while gently jogging in place", "with your knees pressed together"]
    for s in silly:
        for d in DUR[:3]:
            yield dict(name=f"Play {cap(s.split()[0])}... ({cap(d)})",
                       rule=f"Play {s}.",
                       vibe="Gloriously silly", intensity=3, tags=["chaos", "silly"], special=False)


def court():
    for z in ZONES:
        for d in DUR:
            yield dict(name=f"{cap(z)} Is Out ({cap(d)})",
                       rule=f"The {z} is out. Land there, lose the rally.",
                       vibe="Shrinking court", intensity=2 + (1 if d in LONG else 0),
                       tags=["court", slug(z)], special=False)
    for z in ZONES:
        for w in WINDS:
            yield dict(name=f"The {cap(z)} in {cap(w)}",
                       rule=f"Battle {w}; the {z} is your safe zone.",
                       vibe="Set the scene", intensity=2, tags=["court", "weather", slug(z)], special=False)
    for w in WINDS:
        for d in DUR[:3]:
            yield dict(name=f"Weather: {cap(w)} ({cap(d)})",
                       rule=f"Play through {w}.",
                       vibe="Elements", intensity=2, tags=["court", "weather"], special=False)


def meta():
    for a in ADJ:
        for z in ZONES:
            yield dict(name=f"Golden {cap(z)} ({cap(a)})",
                       rule=f"A winner into the {z} ends the game.",
                       vibe="Golden zone", intensity=5, tags=["meta", "sudden-death", slug(z)], special=True)
    for n in [2, 3, 4, 5]:
        yield dict(name=f"This Point Is Worth {n}x",
                   rule=f"This rally is worth {n} points.",
                   vibe="High stakes", intensity=min(5, 2 + n), tags=["meta", "score"], special=(n >= 4))
    for n in [3, 5, 7]:
        yield dict(name=f"Best of {n} Mini-Game",
                   rule=f"Best-of-{n} rally battle for 1 point.",
                   vibe="Mini match", intensity=4, tags=["meta", "mini-game"], special=(n == 7))
    for a in ADJ:
        yield dict(name=f"{cap(a)} Overtime",
                   rule=f"{cap(a)} overtime: next rally double, serve flips.",
                   vibe="Extra drama", intensity=5, tags=["meta", "overtime"], special=True)


GENERATORS = {
    "Shot Restriction": restriction,
    "Body & Movement": body,
    "Wild Card / Swap": swap,
    "Penalty": penalty,
    "Bonus / Reward": bonus,
    "Social & Party": social,
    "Strategy / Skill": strategy,
    "Wacky / Chaos": chaos,
    "Court / Environment": court,
    "Meta & Game-Flow": meta,
}

# Build deduped per-category queues.
queues = {}
for cat, fn in GENERATORS.items():
    q, local = [], set()
    for c in fn():
        key = c["name"].strip().lower()
        if key in seen or key in local:
            continue
        local.add(key)
        q.append(c)
    queues[cat] = q
    print(f"{cat}: {len(q)} candidates")

need = TARGET - len(existing)
order = list(GENERATORS.keys())
idx = {c: 0 for c in order}
chosen = []
while len(chosen) < need:
    progressed = False
    for cat in order:
        if len(chosen) >= need:
            break
        i, q = idx[cat], queues[cat]
        while i < len(q):
            c = q[i]
            i += 1
            key = c["name"].strip().lower()
            if key not in seen:
                seen.add(key)
                chosen.append((cat, c))
                progressed = True
                break
        idx[cat] = i
    if not progressed:
        break

if len(chosen) < need:
    raise SystemExit(f"Only generated {len(chosen)} of {need} needed - widen the banks.")

# Enrich the original 200 with the new metadata fields (no text rewrite).
DEFAULT_INTENSITY = {"Shot Restriction": 2, "Body & Movement": 2, "Wild Card / Swap": 3,
                     "Penalty": 4, "Bonus / Reward": 3, "Social & Party": 1,
                     "Strategy / Skill": 2, "Wacky / Chaos": 3, "Court / Environment": 2,
                     "Meta & Game-Flow": 4}
out = []
for c in existing:
    inten = DEFAULT_INTENSITY.get(c["category"], 3)
    out.append({**c,
                "commentary": voiceify(c["id"], c["effect"]),  # real caller voice (F501)
                "detail": detail(c["category"], c["id"]),        # richer description (F502)
                "callout": CALLOUTS[c["id"] % len(CALLOUTS)],
                "intensity": inten,
                "rarity": "signature",  # the original hand-written set
                "tags": ["original", slug(c["category"])]})

nid = max_id
for n, (cat, c) in enumerate(chosen[:need]):
    nid += 1
    inten = max(1, min(5, c["intensity"]))
    rarity = "legendary" if c["special"] else RARITY_BANDS[inten]
    out.append({"id": nid, "category": cat, "name": c["name"],
                "effect": c["rule"],                      # concise (default)
                "commentary": voiceify(nid, c["rule"]),   # commentator voice (toggle)
                "detail": detail(cat, nid),               # richer description (F502)
                "vibe": c["vibe"],
                "callout": CALLOUTS[nid % len(CALLOUTS)],
                "intensity": inten, "rarity": rarity, "tags": c["tags"]})

# Primary-key integrity.
ids = [c["id"] for c in out]
names = [c["name"].strip().lower() for c in out]
assert len(set(ids)) == len(ids), "duplicate ids!"
assert len(set(names)) == len(names), "duplicate names!"
assert len(out) == TARGET, f"expected {TARGET}, got {len(out)}"

# Flat array for the app.
for path in (PUB, DATA):
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# Full, documented dataset for docs/data.
spread, rarities, intens = {}, {}, {}
for c in out:
    spread[c["category"]] = spread.get(c["category"], 0) + 1
    rarities[c["rarity"]] = rarities.get(c["rarity"], 0) + 1
    intens[c["intensity"]] = intens.get(c["intensity"], 0) + 1

dataset = {
    "meta": {
        "title": "PB Card Deck - The 1729 Deck",
        "total": TARGET,
        "why_1729": ("1729 is the Hardy-Ramanujan 'taxicab' number: the smallest number "
                     "expressible as a sum of two cubes in two different ways "
                     "(1^3 + 12^3 = 9^3 + 10^3). A famously playful bit of maths for a "
                     "famously playful deck - so the deck holds exactly 1729 cards."),
        "philosophy": [
            "Every card is unique - name acts like a primary key, no duplicates.",
            "Commentator voice: each effect is written like a hyped-up courtside caller "
            "so reading the card is half the fun.",
            "Metadata drives replayability: intensity, rarity and tags let the app (and "
            "future modes) tune the experience - chill warm-ups, spicy chaos, themed runs.",
            "Rarity gives a collect-them-all pull: most draws are common, but a legendary "
            "(Golden Zone, Overtime, big multipliers) is a moment.",
        ],
        "schema": {
            "id": "Stable unique integer (primary key).",
            "category": "One of 10 themed buckets.",
            "name": "Unique card title shown large.",
            "effect": "Concise rule text (default card style).",
            "commentary": "The same rule in playful sports-commentator voice (toggled in Settings).",
            "detail": "A richer two-sentence read: how the card plays plus a quick tip.",
            "vibe": "One-line mood tag.",
            "callout": "A short hype shout for flavour / future SFX.",
            "intensity": "1 (chill) to 5 (chaos) - how disruptive the card is.",
            "rarity": "signature (the original 200) | common | uncommon | rare | legendary.",
            "tags": "Searchable keywords (category, shots, zones, themes).",
        },
        "intensity_scale": {"1": "chill", "2": "light", "3": "spicy", "4": "intense", "5": "chaos"},
        "categories": spread,
        "rarities": rarities,
        "intensity_distribution": {str(k): intens[k] for k in sorted(intens)},
    },
    "cards": out,
}
os.makedirs(os.path.dirname(DOCS_DATA), exist_ok=True)
json.dump(dataset, open(DOCS_DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

print("TOTAL:", len(out))
print("spread:", spread)
print("rarities:", rarities)
print("intensity:", {k: intens[k] for k in sorted(intens)})
print("wrote:", PUB, DATA, DOCS_DATA)
