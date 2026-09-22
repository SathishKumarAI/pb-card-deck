# LinkedIn post — PB Card Deck

Draft for the author to post. Not published by anyone else. Two versions: a main
one, and a shorter variant if the feed is being stingy about length. Hashtags and
a comment-reply kit are at the bottom.

---

## Version A — the main post

I built a pickleball app, and it is open for anyone to use. No login, no
install, nothing to pay: **https://pb-card-deck.vercel.app**

It started as a fix for one annoying problem — games where one pair is much
stronger than the other stop being fun for everybody. So the app deals a "twist
card" between points: one small rule for the next rally. Left hand only. Soft
shots only. Swap partners. It pulls mismatched games back together, and it turns
a warm-up into something people actually want to finish.

Then it kept growing, because every group I showed it to asked for one more
thing.

**What is in it today**

→ 1,729 twist cards across 10 categories, in five decks — Family, Party, Drill,
Tournament and Chaos — plus Beginner / Intermediate / Advanced if you would
rather pick by level.

→ A real scoreboard. Side-out scoring, two servers in doubles, win-by-two, best
of 3 or 5. It follows the actual rulebook, including the one nobody remembers:
the side serving first in a game only gets one service turn.

→ Referee mode for a proper match — timeouts, faults, and a downloadable match
sheet at the end.

→ Tournaments for 4 people or 50. Round robin, pools into a playoff, single
elimination, double elimination, rotating partners. Live bracket, standings,
courts, editable scores with a change log so everyone can see what was corrected,
and export to CSV, Markdown, JSON or text. There is a demo event in there if you
want to poke around before running anything real.

→ Share cards. Win, streak, or champion, sized for Instagram and WhatsApp.

→ A help manual written in points, not paragraphs, for people who have never
played. Every bit of pickleball jargon is tappable for a plain-language
definition.

**Two things I decided early and still like**

No accounts and no backend. Everything lives on your own device. People open a
link like this mid-game, in a car park, on bad signal — a signup wall would just
lose them. It also means I am not holding anyone's data.

And when a game ends, the app *asks* before it keeps the result. Local storage
is still someone's phone.

**What I would like from you**

1. **Use it.** Take it to a session this weekend and tell me where it got in the
   way. That feedback is worth more than any feature list I can write.
2. **Ask for features.** There is a "Report a bug or ask for a feature" link at
   the bottom of every screen, and the GitHub issues are open. If you run
   leagues or club sessions, I especially want to hear what your event needs
   that this does not do.
3. **Contribute.** It is open source, TypeScript and Next.js, and the repo is
   set up so you can find things: every folder has a "change → file" table, the
   game rules are pure tested functions, and the traps are written down.
   Use Claude, Copilot, Cursor, whatever you like — I build it with AI tools
   myself and I am not precious about it. Small PRs welcome.

Ideas already on the list and not built yet: a spectator link for a running
event, seeding by rating, consolation draws, scheduled rounds, and more
languages. If one of those is the thing you need, say so and it moves up.

Repo: https://github.com/SathishKumarAI/pb-card-deck
App: https://pb-card-deck.vercel.app

#pickleball #opensource #nextjs #typescript #buildinpublic #sideproject

---

## Version B — short variant

I built a free pickleball app and it is open to everyone:
**https://pb-card-deck.vercel.app** — no login, works offline, hosted on Vercel.

- 1,729 twist cards to deal between points, which keeps mismatched games fun
- A scoreboard that gets side-out scoring and doubles serve rotation right
- Tournaments for 4 to 50 players: round robin, pools, single and double
  elimination, rotating partners, live bracket, exports
- Referee mode with timeouts, faults and a match sheet
- Share cards for Instagram and WhatsApp
- A plain-language manual for people new to the sport

It is open source (Next.js + TypeScript) and I would like two things: tell me
what feature your club or league actually needs, and send a PR if you fancy it —
AI-assisted is completely fine, that is how I build it.

Repo: https://github.com/SathishKumarAI/pb-card-deck

#pickleball #opensource #buildinpublic

---

## If people comment

Short honest replies, ready to paste.

| They ask | Reply |
|---|---|
| "Is my data safe?" | Nothing leaves your device — there is no server and no account. The app asks before it even saves a finished match, and History has a clear-everything button. |
| "Does it work on iPhone / Android?" | Any modern browser. Add it to your home screen and it behaves like an app, offline included. |
| "Can I use it for our club night?" | That is what the tournament side is for — up to ~50 players, five formats, and you can export the results afterwards. Try the demo event first. |
| "Can I add a feature?" | Yes please. Issues are open, and small PRs are easier for me to review than big ones. AI-assisted is fine. |
| "Why 1,729?" | Hardy–Ramanujan's taxicab number: 1³ + 12³ = 9³ + 10³. It made a better target than a round 1,700. |
| "Is it really free?" | Yes, and there is nothing to upsell. It costs me a Vercel hobby plan. |

## Notes before posting

- Check the live link once before you post.
- Best time for a build-in-public post on LinkedIn is a weekday morning.
- A screenshot or a short screen recording of a live bracket will outperform
  either version above on its own — the bracket and the card flip are the two
  things people react to.
