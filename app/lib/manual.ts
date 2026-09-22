/**
 * The in-app manual: every question a player might ask, answered in words a
 * person who has never played pickleball can follow.
 *
 * This file owns the TEXT ONLY. It has no JSX and no React import on purpose:
 * HelpPanel renders it, and search filters it, so the content stays plain data
 * that can be searched, counted, and tested without rendering anything.
 *
 * It does NOT own the glossary (lib/glossary.ts) or the per-card explainer
 * (components/CardDisplay.tsx) - the panel pulls the glossary in so the two
 * never drift.
 */

export interface ManualEntry {
  /** The question in the reader's own words - this is what is shown collapsed. */
  q: string;
  /** The answer. One or two short paragraphs, no jargon without a definition. */
  a: string;
  /** Optional numbered steps, when the answer is genuinely a sequence. */
  steps?: string[];
  /** Extra words people might search for that don't appear in q or a. */
  keywords?: string;
}

export interface ManualSection {
  id: string;
  title: string;
  /** One line under the section title, saying who the section is for. */
  blurb: string;
  entries: ManualEntry[];
}

export const MANUAL: ManualSection[] = [
  {
    id: "start",
    title: "Start here",
    blurb: "Never used the app, or never played pickleball? Read these four.",
    entries: [
      {
        q: "What is PB Card Deck?",
        a: "It is two things in one. A scoreboard for a real pickleball game, and a deck of 1,729 'twist' cards you can draw between points. A twist card is a small, silly or tricky rule that applies to the next rally - 'only soft shots', 'swap partners', 'left hand only'. You still play real pickleball; the cards just keep it interesting and keep mismatched players closer together.",
        keywords: "about purpose what is this app overview intro",
      },
      {
        q: "I have never played pickleball. Can I still use it?",
        a: "Yes, and it is one of the easier ways in. You do not need to know any terms to start: pick Beginner, tap the card, and do what it says. Anything on a card that is pickleball jargon is underlined - tap the word and a plain definition appears. Every card also has a ? button that explains, in ordinary words, what the card means and how to play it.",
        keywords: "new beginner never played first time terms jargon",
      },
      {
        q: "Play your first game in 60 seconds",
        a: "No setup, no account, nothing to install. Start here and you will be playing before anyone finishes tying their shoes.",
        steps: [
          "On the home screen, tap Beginner.",
          "Tap the big card. A twist appears - read it out loud so everyone hears it.",
          "Play the next rally under that twist.",
          "Tap the score of whoever won the rally. The app handles serve and side-out for you.",
          "Tap the card again for a new twist whenever you want one.",
        ],
        keywords: "quick start getting started first game how to begin",
      },
      {
        q: "Do I have to use the cards at all?",
        a: "No. If you just want a scoreboard, choose Track a match on the home screen and leave 'Twist cards' off. You get serve tracking, timeouts, faults and a downloadable match sheet, with no cards anywhere.",
        keywords: "scoreboard only no cards plain scorekeeper disable",
      },
    ],
  },

  {
    id: "playing",
    title: "Playing with cards",
    blurb: "Drawing, skipping and choosing the right deck for your group.",
    entries: [
      {
        q: "How do I draw a card?",
        a: "Tap the card itself, or the Draw button under it. The card flips over and the twist applies to the next rally unless the card says otherwise. Draw whenever the group wants a new one - every point, every few points, or only when the score gets lopsided.",
        keywords: "draw tap flip new card",
      },
      {
        q: "We got a card nobody likes. Now what?",
        a: "Tap Skip in the corner of the card. You get a different one immediately, and the skipped card will not come back in this game.",
        keywords: "skip dislike unwanted reroll next",
      },
      {
        q: "Which deck should we pick?",
        a: "Pick by level if you are unsure - Beginner, Intermediate or Advanced - and the app chooses suitable cards for you. Pick by theme if you know the mood you want: Family is clean fun for all ages, Party is dares and laughs, Drill sharpens specific skills, Tournament stays competitive, and Chaos is all 1,729 cards with nothing held back.",
        keywords: "deck mode family party drill tournament chaos level beginner intermediate advanced choose",
      },
      {
        q: "What is the Daily challenge?",
        a: "A 30-card deck that is the same for everyone in the world on that day, and changes at midnight. Handy for a group that wants the same hand as their friends, or for a short session with a clear end.",
        keywords: "daily challenge today shared deck 30",
      },
      {
        q: "What do the rarity and intensity markings mean?",
        a: "Rarity is how often a card turns up: Common, Uncommon, Rare, then Legendary. A Legendary card is meant to be a moment - big multipliers, golden zones, overtime. Intensity is the row of dots, from Chill to Chaos, telling you how disruptive the twist is before you read it.",
        keywords: "rarity legendary common intensity dots badge",
      },
      {
        q: "Post a win or a streak to Instagram or WhatsApp",
        a: "Anywhere you see Share, the app draws a picture of the result and hands it to your phone's own share sheet - Instagram, WhatsApp and everything else you have installed are in there. Pick the shape first: Square suits the Instagram feed and WhatsApp, Story is full-screen on a phone, Tall is Instagram's 4:5 crop. Copy caption puts the text on your clipboard to paste alongside. On a laptop there is no share sheet, so it saves the PNG instead - neither app can be posted to from a browser, by anyone.",
        keywords: "share instagram whatsapp post image picture story social streak screenshot png caption",
      },
      {
        q: "Where do win streaks come from?",
        a: "From your saved match history, per name. Match history lists a Streaks section: the number is the current run of wins, the dots are recent results newest-first, and the share button next to each one makes the picture. A streak counts consecutive wins up to your most recent match, so one loss resets it - your best-ever run is kept separately and shown on the card.",
        keywords: "streak wins in a row record best run stats history dots",
      },
      {
        q: "Can I save cards I like, or build my own deck?",
        a: "Yes to both. The star on a card saves it to Favourite cards. In the menu, Custom decks lets you build a deck out of exactly the cards you want, then play it like any other deck. Both live on your device.",
        keywords: "favourite favorite star custom deck build own save",
      },
    ],
  },

  {
    id: "scoring",
    title: "Keeping score",
    blurb: "Including the one rule that confuses every new pickleball player.",
    entries: [
      {
        q: "How do I record a point?",
        a: "Tap the score of the team that won the rally - not the team that gets the point. That sounds odd, but it is the whole trick: in pickleball only the serving team scores, so if the receiving team wins a rally they get the serve instead of a point. Tell the app who won the rally and it works out the rest, then says in plain words what happened ('Side out - Hawks serve').",
        keywords: "point score tap rally who won add",
      },
      {
        q: "Why did we win the rally but get no point?",
        a: "Because your side was not serving. In traditional pickleball scoring - called side-out scoring - only the serving team can add to their score. Winning a rally while receiving earns you the serve, and then you can start scoring. If your group would rather every rally be worth a point, turn on Rally scoring: it is a choice when you start a Track a match game, and a toggle in Settings otherwise.",
        keywords: "side out no point serving rally scoring confused why",
      },
      {
        q: "Who is serving, and what is a second server?",
        a: "The yellow marker sits beside the serving team. In doubles each side gets two service turns before the serve passes over: lose a rally on the first server and your partner serves, lose again and it is a side out. When you are refereeing, the board shows 1st or 2nd server so nobody has to remember.",
        keywords: "serve server first second doubles rotation side out who serves",
      },
      {
        q: "Why does it say 2nd server at the start of a game?",
        a: "Because that is the rule, and it is the one that surprises everyone. The side that serves first in a game gets only ONE service turn: their first fault hands the serve straight over instead of passing it to their partner. Referees call this \u201cstarting second server\u201d, and the app shows it the same way, with a note under the board on the opening turn. Without it, the first team would get an extra service turn and every rotation after it would be out by one.",
        keywords: "second server start game 0-0 why opening first serve one server rule confusing",
      },
      {
        q: "We won the rally but the serve moved to the second server",
        a: "That is the serving side losing a rally, which is what moves their serve on - and only the serving side can score. So when you win a rally while receiving, nothing is added to your score: either their second server comes up, or, if that was already their second server, you take the serve. The message under the score names whoever won the rally so it is clear which of the two just happened.",
        keywords: "won rally no point second server moved confusing illogical serve changed",
      },
      {
        q: "We tapped the wrong thing",
        a: "Undo in the top bar takes back the last action, as many times as you need, and says what it took back. That includes a side-out - if you gave the rally to the wrong side and the serve moved, Undo puts the serve back too. There is also a small minus button under each score for a straight correction, and Reset puts the game back to 0 - 0. Reset is itself undoable, and your saved match history is never touched.",
        keywords: "undo mistake wrong fix correct reset minus",
      },
      {
        q: "How does a game end?",
        a: "First team to the points target - 11 by default - wins, but they must be at least 2 points clear. So 11-10 keeps going until someone leads by two. You can change both the target and the win-by-two rule in Settings. A match can be a single game, best of 3, or best of 5; when a team takes the series you get a match-complete screen.",
        keywords: "win winning 11 win by 2 best of 3 5 match end game over",
      },
      {
        q: "Can we pause, or stop for the day?",
        a: "Pause in the top bar freezes the clock and covers the score until you tap Resume - it survives closing the app entirely. If you leave mid-game, the home screen offers Resume last game when you come back, with the score and card exactly where you left them.",
        keywords: "pause break resume stop leave interrupted timeout come back",
      },
      {
        q: "Why is it telling us to switch sides?",
        a: "At the halfway mark of a game - 6 points in an 11-point game - players traditionally swap ends so wind and sun are shared fairly. The app shows a one-off reminder and does not force anything; ignore it if you are playing indoors.",
        keywords: "switch sides swap ends halfway reminder",
      },
    ],
  },

  {
    id: "official",
    title: "Refereeing a real match",
    blurb: "For coaches, umpires and anyone keeping an official-looking result.",
    entries: [
      {
        q: "What does Track a match do differently?",
        a: "It turns the app into a referee's scoresheet. You name the teams and the event, choose singles or doubles, set the points target and match length, and decide whether cards appear at all (off by default). Scoring then follows the serving side: you press 'won' or 'lost' for whoever is serving, and the app moves the serve and the server number correctly.",
        keywords: "official umpire referee coach tournament track a match setup",
      },
      {
        q: "Timeouts, faults and the match sheet",
        a: "Each team has timeout and fault buttons that are counted as the match runs. At the end, Download match sheet saves a plain text file listing the teams, the score game by game, timeouts, faults and the match duration - proof of result you can send to anyone. The match also lands in Match history with its event label.",
        keywords: "timeout fault match sheet download export proof result",
      },
    ],
  },

  {
    id: "tournaments",
    title: "Running a tournament",
    blurb: "One device, any number of players, from a club night to a 50-person day.",
    entries: [
      {
        q: "Set up an event in one paste",
        a: "Tournament is the third button at the top of the home screen. The only slow part of running an event is typing names, so the app takes them all at once.",
        steps: [
          "Tap Tournament, then New tournament, and give it a name.",
          "Pick a format - if you are unsure, Pools then bracket is the usual shape for a big day.",
          "Paste your list, one entry per line. A line can be a single player, or an already-formed pair written as “Sam & Priya”.",
          "Say how many courts you have, and what a game goes to.",
          "Tap Create schedule. Every match, pool and round is generated for you.",
        ],
        keywords: "tournament event create setup league club night 50 players names paste",
      },
      {
        q: "Which format should I pick?",
        a: "Round robin: everyone plays everyone - fairest, best up to about 10 teams. Pools then bracket: split into pools, play a mini round robin, then the top teams knock out - the standard shape for a big field. Single elimination: lose once and you are out, fastest to a winner. Double elimination: everyone gets a second life in a losers bracket, fairest knockout but longest. Rotating partners: players enter alone and get a new partner every round, and the score follows the person - the social mixer.",
        keywords: "format round robin pools bracket single double elimination rotating mixer choose which",
      },
      {
        q: "We have an odd number of people",
        a: "That is fine in every format. A round robin sits one team out each round, in turn. A knockout draw pads up to the next power of two and gives the top seeds a bye, which is awarded automatically - nobody stands around waiting for a match that cannot happen. A partner mixer sits out whoever has sat out least, so the rest is shared evenly.",
        keywords: "odd number bye sit out uneven spare extra person",
      },
      {
        q: "How do results get in?",
        a: "Two ways, and you can mix them freely. Enter score types the final score in two taps, which is what a desk running eight courts wants. Play opens the full scorekeeper for that match - serve tracking, undo, timeouts - and writes the result back to the event when the game ends. Either way the standings, the bracket and the court assignments update immediately.",
        keywords: "score enter result record play scorekeeper desk referee",
      },
      {
        q: "Someone typed the wrong score",
        a: "Open the Schedule tab, find the match and tap Undo result. Anything that depended on it is undone too: a bracket match whose players came from it empties out, and a playoff seeded from a pool is rebuilt once the pool is decided again.",
        keywords: "wrong score mistake fix undo correct result change",
      },
      {
        q: "How are ties in a pool broken?",
        a: "Wins first. If exactly two teams are level, the match between them decides it. With three or more level, head-to-head usually runs in a circle - A beat B, B beat C, C beat A - so the app uses point difference instead, then points scored. The qualifying line in the table shows who is through.",
        keywords: "tie tiebreak head to head point difference equal level standings qualify",
      },
      {
        q: "What do the courts mean?",
        a: "A court holds one match at a time. The On now tab shows exactly as many matches as you have courts, each with its number; everything else is queued under Up next and moves up automatically as results come in. Change the court count when you set the event up.",
        keywords: "courts court number on now up next queue schedule",
      },
      {
        q: "Show me what an event looks like first",
        a: "Tap Tournament, then See a demo event. It opens a half-played 12-team day: pools finished, a bracket drawn, quarter-finals done, one semi-final still to play and one score already corrected. Poke at it, enter a score, watch the tree fill in. Delete it when you are done - it is an ordinary event.",
        keywords: "demo example sample try test see how it works",
      },
      {
        q: "Can I fix a score after it is in?",
        a: "Yes, and the change is visible to everyone afterwards. Find the match in Schedule or tap it in the bracket, then Edit score. The Changes tab lists every result and correction with the time and what the score used to be, so nobody has to take your word for it. Clear removes a result entirely, and anything that depended on it is undone with it.",
        keywords: "edit change wrong score correct fix audit log history who changed",
      },
      {
        q: "Men's, women's and mixed draws",
        a: "Pick the division when you create the event. Mixed is the one that changes the pairing: mark names as \u201cSam (m)\u201d or \u201cPriya (f)\u201d in the list and every pair becomes one of each, strongest with strongest. If the numbers do not balance the app says how many pairs will be same-sex and runs the draw anyway. Running several draws on one day means one event per draw, which keeps their standings and brackets separate.",
        keywords: "mixed doubles mens womens division gender category draw separate",
      },
      {
        q: "Get the results out of the app",
        a: "Export on the event screen offers four shapes: CSV opens straight in Excel, Numbers or Sheets; Markdown suits a write-up; JSON is everything exactly as stored; plain text is for pasting into a group chat. All four carry the results, the standings and the change log. Delete all data in the menu wipes the device clean.",
        keywords: "export excel csv spreadsheet json markdown download save results delete data",
      },
      {
        q: "Can I share the standings?",
        a: "Share on the event screen copies the table - or opens your phone's share sheet - with positions, records and point difference, plus the winner once there is one. It is plain text, so it pastes into any group chat.",
        keywords: "share standings results export copy whatsapp group chat",
      },
    ],
  },

  {
    id: "yours",
    title: "Making it yours",
    blurb: "Settings, sound, themes and the things you can turn off.",
    entries: [
      {
        q: "What can I change in Settings?",
        a: "Points to win (7, 11, 15 or 21), win-by-two, singles or doubles, match length, side-out or rally scoring, sound effects, haptic buzz, spoken score announcements, and a score lock that stops accidental taps while the phone is in a pocket.",
        keywords: "settings options configure points sound haptics lock announce",
      },
      {
        q: "Can the cards read less like a rulebook?",
        a: "Turn on Commentator voice in Settings and every card is rephrased in hyped courtside-caller style. The rule is identical - only the wording changes. Turn it off for short, literal instructions.",
        keywords: "commentator voice flavour text style wording",
      },
      {
        q: "Dark or light?",
        a: "The theme button in the header cycles dark, light and auto. Auto follows whatever your phone is set to, which is usually the right answer outdoors.",
        keywords: "dark light theme auto appearance night bright sun",
      },
      {
        q: "Can I put the score on a big screen?",
        a: "The TV button in the top bar opens a full-screen scoreboard meant to be read from across a court - big numerals, nothing else. Prop the phone or tablet up and tap either side to score.",
        keywords: "tv big screen display courtside scoreboard spectators",
      },
    ],
  },

  {
    id: "data",
    title: "Your data and privacy",
    blurb: "Short version: it never leaves your device.",
    entries: [
      {
        q: "Do I need an account?",
        a: "No. There is no sign-up, no login and no password, because there is no server to log in to. Open the link and play.",
        keywords: "account login signup password free register",
      },
      {
        q: "Where is my data stored?",
        a: "In your browser, on your device. Match history, custom decks, favourites and the game in progress are all local. Nothing is uploaded, there is no database and no analytics on your play. The trade-off is that your data does not follow you to another phone unless you move it yourself.",
        keywords: "privacy storage local data cloud sync server database",
      },
      {
        q: "How do I move everything to another phone?",
        a: "Menu, then Export backup - you get a single file. On the other device, Menu, then Import backup, and pick that file. Decks and history come across. Delete all data wipes this device clean if you are handing the phone on.",
        keywords: "backup export import transfer move new phone delete wipe",
      },
      {
        q: "Does it work without signal?",
        a: "Yes, after the first load. Courts have famously bad reception, so the app keeps a copy of itself on your device. You can also install it: open the site in your phone browser and choose Add to Home Screen, and it launches like a normal app.",
        keywords: "offline signal wifi install pwa home screen app store",
      },
    ],
  },

  {
    id: "trouble",
    title: "If something looks wrong",
    blurb: "The handful of things people ask about most.",
    entries: [
      {
        q: "The cards do not suit our group",
        a: "Switch deck: the deck name in the top bar is a button, and you can change it mid-game without losing the score. Family is the safest for mixed ages and children; Drill is the driest and most practical. If a specific card keeps annoying you, Skip removes it for the rest of the game.",
        keywords: "inappropriate rude kids children wrong tone change deck mid game",
      },
      {
        q: "My screen keeps going to sleep",
        a: "During an active game the app asks your phone to stay awake, which most modern phones honour. If yours does not, raise the screen timeout in your phone's own display settings - no app can override that.",
        keywords: "sleep dim screen timeout awake lock display",
      },
      {
        q: "Is it really free?",
        a: "Yes. It is made for fun and for personal use, with no ads, no payment and nothing to unlock. It is not for resale.",
        keywords: "free cost price pay ads purchase premium",
      },
      {
        q: "Something is broken, or I have an idea",
        a: "Send feedback in the menu, or open an issue on GitHub from the link at the bottom of the home screen. Bug reports and feature requests are both welcome.",
        keywords: "bug report feedback issue broken suggestion contact support",
      },
      {
        q: "Why exactly 1,729 cards?",
        a: "1,729 is the Hardy-Ramanujan 'taxicab' number: the smallest number that can be written as the sum of two cubes in two different ways (1³ + 12³ and 9³ + 10³). It is a mathematician's joke about a supposedly dull number, and it made a better target than a round 1,700.",
        keywords: "1729 ramanujan taxicab number why count trivia",
      },
    ],
  },
];

/** Every entry, flattened, with its section - what search runs over. */
export function allEntries(): { section: ManualSection; entry: ManualEntry }[] {
  return MANUAL.flatMap((section) => section.entries.map((entry) => ({ section, entry })));
}

/**
 * Case-insensitive search across the question, the answer, any steps and the
 * hidden keywords. Every word in the query must appear somewhere in the entry,
 * so "score wrong" finds the undo answer while "wrong score tap" still does.
 */
export function searchManual(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return allEntries();
  return allEntries().filter(({ entry }) => {
    const hay = [entry.q, entry.a, entry.steps?.join(" ") ?? "", entry.keywords ?? ""]
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
