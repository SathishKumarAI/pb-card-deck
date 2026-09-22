// Shared pickleball glossary — single source of truth for the Rules panel's
// Glossary tab AND the in-card tap-to-define highlighter (GlossaryText).
// Each term lists aliases so the highlighter can match plurals/variants.

export interface GlossaryTerm {
  term: string;
  aliases: string[];
  def: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: "Transition zone",
    aliases: ["transition zone", "transition area", "no-man's land", "no man's land"],
    def: "The strip of court between the baseline and the kitchen line. You move THROUGH it rather than stand in it - a ball landing at your feet here is the hardest one to answer.",
  },
  {
    term: "Centre line",
    aliases: ["centre line", "center line", "centreline", "centerline"],
    def: "The line running from the baseline to the kitchen that splits each side into two service courts. Your serve must land in the service court diagonally opposite.",
  },
  {
    term: "Kitchen line",
    aliases: ["kitchen line", "non-volley line", "nvz line"],
    def: "The line 7 feet from the net marking the front of the kitchen. Standing on it counts as being IN the kitchen, so you cannot volley with a foot touching it.",
  },
  {
    term: "Sideline",
    aliases: ["sideline", "sidelines"],
    def: "The long line down each edge of the court. A ball touching any line except the kitchen line on a serve is in.",
  },
  {
    term: "Service court",
    aliases: ["service court", "service box"],
    def: "One of the two boxes on each side, made by the centre line and the kitchen line. The serve must land in the one diagonally across from the server.",
  },
  {
    term: "Third shot",
    aliases: ["third shot", "third-shot", "third shot drive"],
    def: "The serving team's shot after the return - the one that decides whether they get to the net. Usually a soft drop into the kitchen, sometimes a hard drive.",
  },
  {
    term: "Drive",
    aliases: ["drive", "drives", "driving"],
    def: "A hard, flat shot hit with pace, usually from the back of the court. The opposite of a drop.",
  },
  {
    term: "Reset",
    aliases: ["reset shot", "resetting"],
    def: "A soft shot that takes the speed out of a fast exchange and drops the ball into the kitchen, so you can get back to a neutral rally.",
  },
  {
    term: "Ace",
    aliases: ["ace", "aces"],
    def: "A serve the receiver never touches. Rare in pickleball, because the serve must be hit underhand.",
  },
  {
    term: "Fault",
    aliases: ["fault", "faults"],
    def: "Anything that ends the rally against you: the ball into the net, out of bounds, a volley from the kitchen, or a double bounce.",
  },
  {
    term: "Double bounce rule",
    aliases: ["double bounce", "two bounce rule", "double-bounce rule"],
    def: "The serve must bounce once, and the return must bounce once, before anyone may volley. It is what stops the serving team rushing the net immediately.",
  },
  {
    term: "Dead ball",
    aliases: ["dead ball"],
    def: "A ball no longer in play, because the rally ended on a fault, a let, or a call.",
  },
  {
    term: "Paddle",
    aliases: ["paddle", "paddles"],
    def: "What you hit with. Solid-faced and about twice the size of a table-tennis bat - no strings.",
  },
  {
    term: "Second server",
    aliases: ["second server", "server 2", "2nd server"],
    def: "In doubles, each side gets two servers before the serve passes over. When the first server's rally is lost, their partner serves; when the second loses, it is a side-out.",
  },
  {
    term: "Pool",
    aliases: ["pool", "pools", "pool play"],
    def: "A small group that plays a round robin among itself. The top finishers go through to the knockout bracket.",
  },
  {
    term: "Seed",
    aliases: ["seed", "seeded", "seeding"],
    def: "A team's rank going into a draw. Seeding spreads the strong teams out so they meet late rather than in round one.",
  },
  {
    term: "Bye",
    aliases: ["bye", "byes"],
    def: "A free pass into the next round, given when a draw has fewer teams than slots. The top seeds get them.",
  },
  {
    term: "Dink",
    aliases: ["dink", "dinks", "dinking"],
    def: "A soft shot hit from near the net that arcs over and drops into the opponent's kitchen, too low to attack.",
  },
  {
    term: "Kitchen (Non-Volley Zone)",
    aliases: ["kitchen", "non-volley zone", "nvz", "non volley zone"],
    def: "The 7-foot zone on each side of the net. You can't hit the ball out of the air (volley) while standing in it.",
  },
  {
    term: "Volley",
    aliases: ["volley", "volleys", "volleying"],
    def: "Hitting the ball out of the air before it bounces. Legal everywhere except the kitchen.",
  },
  {
    term: "Third-shot drop",
    aliases: ["third-shot drop", "third shot drop", "third-shot", "third shot"],
    def: "A soft shot by the serving team on the third hit, landing in the kitchen so they can move up to the net.",
  },
  {
    term: "Side-out",
    aliases: ["side-out", "side out", "sideout", "side-outs"],
    def: "When the serving side loses the rally and the serve passes to the other team. Only the serving team scores.",
  },
  {
    term: "Erne",
    aliases: ["erne", "ernes"],
    def: "An aggressive volley hit just outside the kitchen near the sideline, often after jumping around the corner.",
  },
  {
    term: "Poach",
    aliases: ["poach", "poaching", "poaches"],
    def: "When a player crosses into their partner's area to take a shot, usually to surprise the opponents.",
  },
  {
    term: "Lob",
    aliases: ["lob", "lobs", "lobbing"],
    def: "A high, deep shot sent over the opponents to push them back off the net.",
  },
  {
    term: "Let",
    aliases: ["let", "lets"],
    def: "A serve that clips the net but still lands in the correct service box. In most modern rules, play simply continues.",
  },
  {
    term: "Stacking",
    aliases: ["stacking", "stack"],
    def: "A positioning tactic where partners line up on the same side to keep their preferred forehands in the middle.",
  },
  {
    term: "Rally",
    aliases: ["rally", "rallies"],
    def: "The back-and-forth of hits after the serve, until one side wins the point.",
  },
  {
    term: "Serve",
    aliases: ["serve", "serving", "server"],
    def: "The underhand hit that starts each point, made diagonally from behind the baseline.",
  },
  {
    term: "Rally scoring",
    aliases: ["rally scoring"],
    def: "A scoring style where the winner of every rally gets a point, whether or not they served.",
  },
  {
    term: "Groundstroke",
    aliases: ["groundstroke", "groundstrokes"],
    def: "A shot hit after the ball has bounced once, usually from the back of the court.",
  },
  {
    term: "Baseline",
    aliases: ["baseline"],
    def: "The line at the very back of each side of the court.",
  },
  {
    term: "Backhand",
    aliases: ["backhand", "backhands"],
    def: "A shot hit with the back of the paddle hand facing the ball (across your body).",
  },
  {
    term: "Forehand",
    aliases: ["forehand", "forehands"],
    def: "A shot hit with the palm side of the paddle hand, on your dominant side.",
  },
];

// Pre-flattened alias → term map for fast lookup, longest aliases first so
// multi-word terms ("non-volley zone") win over their sub-words.
export const GLOSSARY_BY_ALIAS: { alias: string; term: GlossaryTerm }[] = GLOSSARY.flatMap((t) =>
  t.aliases.map((alias) => ({ alias, term: t })),
).sort((a, b) => b.alias.length - a.alias.length);
