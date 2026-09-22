# Feature Backlog — 557

Production-readiness + user-friendliness roadmap for the PB Card Deck app.

**Direction:** Hybrid — fully local-first by default (no login, offline), with **optional** account login for cross-device sync. Local stays the default hot path; cloud is additive.

**Legend**
- **Priority:** `P0` ship-blocking / production-critical · `P1` high value next · `P2` later / nice-to-have
- **Effort:** `S` <½ day · `M` ~1–3 days · `L` multi-day / needs design
- **Status:** `todo` · `wip` · `done` · `parked`

Categories: **A** Core Gameplay & Decks · **B** UX, Accessibility & Design · **C** Production, Infra & Quality · **D** Growth, Social & Monetization.

---

## A. Core Gameplay & Decks (F001–F125)

### A1 · Game modes & variants
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F001 | Around-the-world rotation (winners move up courts) | P2 | M | todo |
| F002 | King-of-the-court mode | P2 | M | todo |
| F003 | Round-robin scheduler for N players / M courts | P1 | L | todo |
| F004 | Ladder league mode | P2 | L | todo |
| F005 | Dink-only challenge mode | P2 | S | todo |
| F006 | Speed-up / timed game mode | P2 | M | todo |
| F007 | Solo practice / drill mode (no opponent) | P1 | M | todo |
| F008 | Singles (1v1) toggle alongside doubles default | P1 | S | done |
| F009 | Skinny-singles mode | P2 | S | todo |
| F010 | Co-op vs deck (cards act as opponent) | P2 | M | todo |
| F011 | Single-elimination bracket | P1 | L | todo |
| F012 | Double-elimination bracket | P2 | L | todo |
| F013 | Pool play → bracket flow | P2 | L | todo |
| F014 | Scramble / best-ball fun mode | P2 | M | todo |
| F015 | Handicap / point-spotting mode | P2 | M | todo |
| F016 | Streak mode (consecutive points under twists) | P2 | S | todo |
| F017 | Survival mode (lose on failed twist) | P2 | S | todo |
| F018 | Daily challenge (seeded deck-of-the-day) | P1 | M | done |

### A2 · Card draw mechanics
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F019 | Shake-to-draw (device motion) | P2 | S | todo |
| F020 | Auto-draw each point toggle | P1 | S | todo |
| F021 | Draw timer (twist expires after N points) | P2 | M | todo |
| F022 | Multi-card / combo twists | P2 | M | todo |
| F023 | Card reroll / veto with limited tokens | P2 | S | todo |
| F024 | Lock card to keep twist across points | P1 | S | todo |
| F025 | Difficulty filter on draw | P1 | S | todo |
| F026 | Weighted-draw-by-rarity tuning UI | P2 | M | todo |
| F027 | No-repeat window (avoid recent cards) | P1 | S | todo |
| F028 | Per-team separate draws | P2 | M | todo |
| F029 | Draw-history strip (last N cards) | P1 | S | done |
| F030 | Card peek/preview before commit | P2 | S | todo |
| F031 | Voice readout of drawn card (TTS) | P2 | M | todo |
| F032 | Card flip/deal animation options | P2 | M | todo |
| F033 | Wildcard that picks a random category | P2 | S | todo |
| F034 | Favorite / pin cards to reuse | P2 | S | todo |
| F035 | Hide-card suspense reveal mode | P2 | S | todo |
| F036 | Two-sided cards (challenge + reward) | P2 | M | todo |

### A3 · Deck building & management
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F037 | Visual drag-drop deck builder | P1 | L | todo |
| F038 | Filter cards by tag/intensity/rarity in builder | P1 | M | todo |
| F039 | Save multiple named custom decks | P1 | M | todo |
| F040 | Duplicate / clone a deck | P1 | S | done |
| F041 | Deck cover art / color picker | P2 | S | todo |
| F042 | Share deck via URL/code | P1 | M | done |
| F043 | Import community deck by code | P1 | M | done |
| F044 | Deck-size cap warnings | P2 | S | todo |
| F045 | Per-deck rules (e.g. no draw on serve) | P2 | M | todo |
| F046 | Deck templates by skill level | P1 | S | todo |
| F047 | Quick-toggle categories in/out | P1 | S | todo |
| F048 | Full-text card search in builder | P1 | S | done |
| F049 | Bulk add/remove by tag | P2 | S | todo |
| F050 | Deck stats (rarity distribution chart) | P2 | M | done |
| F051 | Mark deck as default | P1 | S | todo |
| F052 | Archive deck (soft, keep) | P2 | S | todo |
| F053 | Deck version history | P2 | M | todo |
| F054 | AI-suggested deck from prompt | P2 | L | todo |
| F055 | Kids / family-safe deck filter | P1 | S | todo |
| F056 | Adult / party deck flag + gate | P1 | S | todo |
| F057 | Deck export to JSON file | P1 | S | todo |
| F058 | Deck import from JSON file | P1 | S | todo |

### A4 · Scoring engine
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F059 | Rally scoring option (vs side-out) | P1 | M | done |
| F060 | Custom win target (11/15/21) | P1 | S | done |
| F061 | Win-by-1 option | P1 | S | done |
| F062 | Switch-sides-at-midpoint reminder | P1 | S | done |
| F063 | Doubles serving rotation indicator (server 1/2) | P0 | M | done |
| F064 | Let-serve toggle | P2 | S | todo |
| F065 | Manual score correction | P0 | S | done |
| F066 | Point-by-point timeline log | P1 | M | todo |
| F067 | Per-point twist attribution in log | P2 | M | todo |
| F068 | Game clock / elapsed time | P2 | S | todo |
| F069 | Shot clock per serve option | P2 | S | todo |
| F070 | Time-cap games (most points at time) | P2 | M | todo |
| F071 | Score announce TTS | P2 | S | todo |
| F072 | Big-score TV / cast display mode | P1 | M | done |
| F073 | Two-team custom names + colors | P1 | S | todo |
| F074 | Score gestures (swipe up/down) | P2 | S | todo |
| F075 | Foot-fault / fault counters | P2 | S | done |
| F076 | Timeout tracking | P2 | S | done |
| F077 | Auto game-point / match-point banner | P1 | S | done |
| F078 | Tiebreak handling | P2 | M | todo |

### A5 · Match structure & flow
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F079 | Best-of-N configurable (1/3/5/7) | P1 | S | done |
| F080 | Save match templates | P2 | S | todo |
| F081 | Side-switch every N points config | P2 | S | todo |
| F082 | Warmup timer before match | P2 | S | todo |
| F083 | Between-game rest timer | P2 | S | todo |
| F084 | Match notes field | P2 | S | todo |
| F085 | Resume multiple in-progress matches | P1 | M | done |
| F086 | Match templates per venue | P2 | S | todo |
| F087 | Pre-match coin toss / serve picker | P2 | S | todo |
| F088 | Game-to-game carryover display | P2 | S | todo |
| F089 | Match summary screen → export image | P1 | M | todo |
| F090 | One-tap rematch | P1 | S | done |
| F091 | Match tagging (casual/league/practice) | P2 | S | todo |
| F092 | Match-complete shareable card image | P1 | M | done |

### A6 · Player roster & shuffle (the rotation engine)
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F093 | Player roster CRUD with avatars | P0 | M | todo |
| F094 | Auto-generate balanced teams | P0 | M | todo |
| F095 | Partner rotation (everyone partners everyone) | P0 | L | todo |
| F096 | Sit-out fairness rotation (even rest) | P0 | M | todo |
| F097 | Court assignment for N courts | P0 | M | todo |
| F098 | Skill-rating-based matchmaking | P1 | L | todo |
| F099 | Mexicano format generator | P1 | L | todo |
| F100 | Americano format generator | P1 | L | todo |
| F101 | Drag-drop manual court assignment | P1 | M | todo |
| F102 | Round timer with auto-advance | P1 | M | todo |
| F103 | Next-round / on-deck preview | P1 | S | todo |
| F104 | Print / share round schedule | P1 | M | todo |
| F105 | Avoid-repeat-partner constraint toggle | P1 | M | todo |
| F106 | Late-joiner insertion into rotation | P1 | M | todo |
| F107 | Player check-in / out mid-session | P1 | M | todo |
| F108 | Per-player session summary (games, wins) | P1 | M | todo |
| F109 | QR self-check-in for players | P2 | M | todo |
| F110 | Gender / level balancing constraints | P2 | M | todo |

### A7 · Stats & history
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F111 | Lifetime win/loss record (local) | P1 | S | done |
| F112 | Per-deck play stats | P2 | M | todo |
| F113 | Most-drawn-cards leaderboard | P2 | S | todo |
| F114 | Card win-rate correlation | P2 | M | todo |
| F115 | Session history list with filters | P1 | M | todo |
| F116 | Export full history CSV | P1 | S | done |
| F117 | Streaks & personal records | P2 | S | todo |
| F118 | Heatmap calendar of play days | P2 | M | todo |
| F119 | Head-to-head records between players | P2 | M | todo |
| F120 | Charts dashboard | P2 | M | todo |
| F121 | Achievement / badge system | P2 | L | done |
| F122 | Shareable stats card | P2 | M | todo |
| F123 | Undo across whole match | P1 | M | todo |
| F124 | Trash / restore deleted matches (soft) | P1 | S | todo |
| F125 | Data-usage / storage-size meter | P2 | S | todo |

---

## B. UX, Accessibility & Design (F126–F250)

### B1 · Onboarding
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F126 | First-run interactive tutorial | P0 | M | done |
| F127 | Sample-game walkthrough | P1 | M | todo |
| F128 | Coachmarks / tooltips on key buttons | P1 | S | todo |
| F129 | Empty-state guidance everywhere | P0 | M | done |
| F130 | "What's new" changelog modal | P1 | S | todo |
| F131 | Quick-start preset (1-tap demo game) | P0 | S | done |
| F132 | Contextual "?" help per screen | P1 | S | todo |
| F133 | Skippable + resumable onboarding | P1 | S | todo |
| F134 | Persona picker (player/organizer/coach) | P2 | M | todo |
| F135 | Demo deck preloaded for new users | P1 | S | todo |
| F136 | Setup progress checklist | P2 | S | todo |
| F137 | How-to gif/video embeds | P2 | M | todo |
| F138 | Glossary of pickleball terms | P2 | S | done |
| F139 | Re-run tutorial from settings | P1 | S | done |
| F140 | Onboarding-completion analytics event | P1 | S | todo |

### B2 · Accessibility
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F141 | Full keyboard navigation | P0 | M | done |
| F142 | Visible focus rings everywhere | P0 | S | done |
| F143 | ARIA labels on all controls | P0 | M | done |
| F144 | Screen-reader live region for score/cards | P0 | M | done |
| F145 | Honor reduced-motion | P0 | S | done |
| F146 | High-contrast theme | P1 | S | todo |
| F147 | Color-blind-safe palette + patterns | P1 | M | todo |
| F148 | Font-size / text-scaling control | P1 | S | todo |
| F149 | Dyslexia-friendly font option | P2 | S | todo |
| F150 | 44px min tap-target audit | P0 | S | done |
| F151 | Skip-to-content link | P1 | S | todo |
| F152 | Haptic alternatives for audio cues | P2 | S | todo |
| F153 | Captions for audio/TTS | P2 | S | todo |
| F154 | Voice control / commands | P2 | L | todo |
| F155 | Adjustable timer alert styles | P2 | S | todo |
| F156 | Contrast checker in theme builder | P2 | S | todo |
| F157 | Form-error announcements | P1 | S | todo |
| F158 | Landmark roles for layout | P1 | S | todo |
| F159 | Respect prefers-color-scheme | P1 | S | done |
| F160 | Switch-control / large-button mode | P2 | M | todo |
| F161 | axe-core automated a11y test in CI | P0 | M | done |
| F162 | WCAG 2.2 AA audit checklist doc | P1 | S | todo |

### B3 · Internationalization
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F163 | i18n framework (next-intl) | P1 | M | todo |
| F164 | Language switcher | P1 | S | todo |
| F165 | Spanish translation | P1 | M | todo |
| F166 | RTL layout support | P2 | M | todo |
| F167 | Locale number/date formatting | P2 | S | todo |
| F168 | Translate all 1,729 cards (pipeline) | P2 | L | todo |
| F169 | Community translation contributions | P2 | M | todo |
| F170 | Pseudo-localization test build | P2 | S | todo |
| F171 | Per-locale deck variants | P2 | M | todo |
| F172 | Units localization | P2 | S | todo |
| F173 | Detect browser locale on first load | P1 | S | todo |
| F174 | Translation-coverage report | P2 | S | todo |
| F175 | French translation | P2 | M | todo |
| F176 | RTL card-text mirroring fix | P2 | S | todo |

### B4 · Responsive & mobile
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F177 | Tablet two-pane layout | P2 | M | todo |
| F178 | Landscape-optimized scoreboard | P1 | M | todo |
| F179 | Foldable / large-screen support | P2 | M | todo |
| F180 | Desktop keyboard-shortcuts overlay | P2 | S | todo |
| F181 | Safe-area audit all screens | P1 | S | todo |
| F182 | One-handed reachability mode | P2 | M | todo |
| F183 | Disable pull-to-refresh where harmful | P1 | S | todo |
| F184 | Sticky action bar on scroll | P1 | S | todo |
| F185 | Bottom-sheet patterns for mobile | P1 | M | todo |
| F186 | Swipe-gesture navigation | P2 | M | todo |
| F187 | Prevent accidental double-tap actions | P1 | S | todo |
| F188 | Wake-lock to keep screen on during match | P0 | S | done |
| F189 | Orientation-lock toggle | P2 | S | todo |
| F190 | Cast / external-display support | P2 | L | todo |
| F191 | Wearable companion (stretch) | P2 | L | todo |
| F192 | Responsive typography scale | P1 | S | todo |
| F193 | Touch + mouse hybrid handling | P1 | S | todo |
| F194 | Courtside TV-mode layout | P1 | M | todo |
| F195 | Picture-in-picture score widget | P2 | L | todo |
| F196 | Home-screen widget (PWA) | P2 | L | todo |

### B5 · Visual & theme
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F197 | Theme builder (custom colors) | P2 | M | todo |
| F198 | Multiple preset themes | P1 | S | todo |
| F199 | Catppuccin theme set | P2 | S | todo |
| F200 | Per-deck theming | P2 | M | todo |
| F201 | Dark/light/auto with manual override | P1 | S | done |
| F202 | Rarity visual effects (foil/holo) | P2 | M | todo |
| F203 | Confetti / celebration polish | P2 | S | todo |
| F204 | Sound-pack options | P2 | M | todo |
| F205 | Custom app-icon choices | P2 | S | todo |
| F206 | Splash-screen branding | P1 | S | todo |
| F207 | Motion-design tokens | P2 | S | todo |
| F208 | Design-token audit (CSS vars) | P1 | M | todo |
| F209 | Iconography unification | P1 | S | todo |
| F210 | Loading skeletons everywhere | P1 | M | todo |
| F211 | Button micro-interactions | P2 | S | todo |
| F212 | Empty/error illustration set | P2 | M | todo |
| F213 | Typography pairing refresh | P2 | S | todo |
| F214 | Court-background visual themes | P2 | S | todo |
| F215 | Seasonal / holiday themes | P2 | S | todo |
| F216 | Brand style-guide doc | P1 | S | todo |

### B6 · Interactions & feedback
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F217 | Optimistic UI on all actions | P1 | M | todo |
| F218 | Toast / snackbar system | P0 | S | done |
| F219 | Undo toasts for destructive acts | P0 | S | done |
| F220 | Inline form validation | P1 | S | todo |
| F221 | Haptic-feedback tuning settings | P2 | S | todo |
| F222 | Volume + mute per sound category | P2 | S | todo |
| F223 | Drag-drop reordering polish | P2 | S | todo |
| F224 | Long-press context menus | P2 | S | todo |
| F225 | Gesture cheat-sheet | P2 | S | todo |
| F226 | Confirm only when truly needed | P1 | S | todo |
| F227 | Auto-save indicators | P1 | S | todo |
| F228 | Online/offline status banner | P0 | S | done |
| F229 | Sync-status indicator (hybrid) | P1 | S | todo |
| F230 | Pull-to-draw card gesture | P2 | S | todo |
| F231 | Keyboard shortcut for draw/score | P1 | S | todo |
| F232 | Focus-trap in modals | P0 | S | done |
| F233 | Scroll-restore on back | P1 | S | todo |
| F234 | Animated score-number transitions | P2 | S | todo |

### B7 · In-app help & content pages
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F235 | Searchable in-app help center | P1 | M | todo |
| F236 | FAQ section | P1 | S | todo |
| F237 | Official pickleball rules reference | P2 | S | todo |
| F238 | Card-category explainer pages | P2 | S | todo |
| F239 | Tip-of-the-day | P2 | S | todo |
| F240 | In-app feedback form | P1 | S | todo |
| F241 | Report-a-card-issue button | P1 | S | todo |
| F242 | Keyboard-shortcut reference | P2 | S | todo |
| F243 | Accessibility statement page | P1 | S | done |
| F244 | Privacy policy page | P0 | S | done |
| F245 | Terms of service page | P0 | S | done |
| F246 | About / credits page | P1 | S | done |
| F247 | Public roadmap page | P2 | S | todo |
| F248 | Release-notes feed | P2 | S | todo |
| F249 | Login-free welcome screen | P1 | S | todo |
| F250 | Help-search analytics | P2 | S | todo |

---

## C. Production, Infra & Quality (F251–F375)

### C1 · Testing
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F251 | Unit tests — scoring engine | P0 | M | done |
| F252 | Unit tests — shuffle/rotation algorithms | P0 | M | todo |
| F253 | Unit tests — card draw/weighting | P0 | M | done |
| F254 | Component tests (RTL) | P0 | M | done |
| F255 | E2E tests (Playwright) core flows | P0 | L | todo |
| F256 | Visual-regression tests | P1 | M | todo |
| F257 | PWA/offline E2E test | P1 | M | todo |
| F258 | Accessibility tests (axe) in CI | P0 | M | done |
| F259 | Coverage reporting + threshold | P1 | S | todo |
| F260 | Property-based tests — scoring edge cases | P1 | M | todo |
| F261 | Snapshot tests — card rendering | P2 | S | todo |
| F262 | Cross-browser test matrix | P1 | M | todo |
| F263 | Mobile device-emulation tests | P1 | M | todo |
| F264 | Load test — API routes | P2 | M | todo |
| F265 | Contract tests — API | P2 | M | todo |
| F266 | Seed/fixture factory for tests | P1 | S | todo |
| F267 | Mutation testing | P2 | M | todo |
| F268 | Lint + typecheck gate in CI | P0 | S | done |
| F269 | Pre-commit hooks (husky/lint-staged) | P0 | S | todo |
| F270 | Test-data generator for decks | P2 | S | todo |
| F271 | Flaky-test detection / retry | P2 | S | todo |
| F272 | Storybook for components | P2 | M | todo |

### C2 · CI/CD
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F273 | GitHub Actions CI pipeline | P0 | M | done |
| F274 | PR preview deploys (Vercel) | P0 | S | done |
| F275 | Required status checks on main | P0 | S | wip |
| F276 | Automated dependency updates | P1 | S | done |
| F277 | Semantic-release / changelog automation | P1 | M | todo |
| F278 | Conventional-commits enforcement | P1 | S | todo |
| F279 | Branch-protection rules doc | P1 | S | todo |
| F280 | Rollback runbook + one-click rollback | P0 | S | done |
| F281 | Canary / rolling-release config | P2 | M | todo |
| F282 | Build-size budget check in CI | P1 | S | todo |
| F283 | Lighthouse-CI budget gate | P1 | M | todo |
| F284 | Bundle-analyzer CI artifact | P1 | S | todo |
| F285 | Staging environment | P1 | S | todo |
| F286 | Env-var management via `vercel env` | P0 | S | done |
| F287 | Secret scanning in CI | P0 | S | done |
| F288 | SBOM generation | P2 | S | todo |
| F289 | Release-tagging automation | P2 | S | todo |
| F290 | Deploy notifications (Slack/Discord) | P2 | S | todo |

### C3 · Observability
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F291 | Error tracking (Sentry) | P0 | M | todo |
| F292 | Source-map upload for traces | P0 | S | todo |
| F293 | Web-vitals / RUM monitoring | P1 | S | todo |
| F294 | Privacy-respecting analytics (Plausible) | P1 | S | todo |
| F295 | Custom event-tracking plan | P1 | S | todo |
| F296 | Funnel analytics (draw → score) | P2 | M | todo |
| F297 | Uptime monitoring + alerts | P1 | S | todo |
| F298 | Structured logging on API | P1 | S | todo |
| F299 | Request tracing (OpenTelemetry) | P2 | M | todo |
| F300 | Performance dashboards | P2 | M | todo |
| F301 | Crash-free-sessions metric | P1 | S | todo |
| F302 | Feature-flag-aware analytics | P2 | S | todo |
| F303 | Console-error budget alert | P2 | S | todo |
| F304 | Service-worker update telemetry | P2 | S | todo |
| F305 | Offline-usage metrics | P2 | M | todo |
| F306 | Alert routing / on-call doc | P2 | S | todo |
| F307 | Synthetic monitoring of key flows | P2 | M | todo |
| F308 | Privacy-compliant consent banner | P1 | S | todo |

### C4 · Performance
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F309 | Code-split routes/components | P1 | M | todo |
| F310 | Lazy/chunked load of 1,729-card data | P0 | M | done |
| F311 | Virtualize long card lists | P1 | M | todo |
| F312 | Image optimization (next/image) audit | P1 | S | todo |
| F313 | Font subsetting + preload | P1 | S | todo |
| F314 | JS bundle-size target + trim | P1 | M | todo |
| F315 | Memoize heavy computations | P1 | S | todo |
| F316 | Web worker for shuffle/scheduling | P2 | M | todo |
| F317 | IndexedDB for large local data | P1 | M | todo |
| F318 | Cache cards in service worker | P1 | S | todo |
| F319 | Prefetch likely next screens | P2 | S | todo |
| F320 | Debounce/throttle inputs | P1 | S | todo |
| F321 | Layout-thrash (CLS) audit | P1 | S | todo |
| F322 | LCP optimization audit | P1 | S | todo |
| F323 | TBT reduction on draw | P1 | S | todo |
| F324 | Compress data.json (gzip/brotli) | P1 | S | todo |
| F325 | Remove unused deps/code (treeshake) | P1 | S | todo |
| F326 | Lighthouse 95+ all categories | P1 | M | todo |

### C5 · Security
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F327 | Content-Security-Policy headers | P0 | M | wip |
| F328 | Security headers (HSTS, X-Frame, etc.) | P0 | S | done |
| F329 | Auth hardening (httpOnly cookies) | P0 | S | todo |
| F330 | Rate limiting on API routes | P0 | M | todo |
| F331 | Input validation (zod) on all endpoints | P0 | M | todo |
| F332 | CSRF protection | P0 | S | todo |
| F333 | Supabase RLS policies | P0 | M | todo |
| F334 | Secrets-out-of-client-bundle audit | P0 | S | done |
| F335 | Dependency vuln scanning | P0 | S | done |
| F336 | OWASP top-10 review | P1 | M | todo |
| F337 | Bot protection (Vercel BotID) on auth | P1 | S | todo |
| F338 | Password policy + breach check | P1 | S | todo |
| F339 | Account-lockout / brute-force guard | P1 | S | todo |
| F340 | Audit log for auth events | P2 | S | todo |
| F341 | PII data-handling review | P1 | S | todo |
| F342 | GDPR/CCPA data export + delete | P0 | M | done |
| F343 | Penetration-test checklist | P2 | S | todo |
| F344 | security.txt + disclosure policy | P2 | S | todo |

### C6 · PWA & offline
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F345 | SW update flow (skipWaiting prompt) | P0 | S | done |
| F346 | Offline fallback page | P1 | S | todo |
| F347 | Background sync for hybrid uploads | P1 | M | todo |
| F348 | Cache-versioning strategy | P1 | S | todo |
| F349 | Installability audit (manifest) | P1 | S | todo |
| F350 | App shortcuts in manifest | P2 | S | todo |
| F351 | Share-target API integration | P2 | M | todo |
| F352 | Periodic background sync (decks) | P2 | M | todo |
| F353 | Offline-first data-layer abstraction | P1 | M | todo |
| F354 | Storage-quota handling + warnings | P1 | S | todo |
| F355 | Sync conflict resolution (merge) | P1 | L | todo |
| F356 | "Add to home screen" prompt UX | P1 | S | todo |

### C7 · Data & hybrid backend
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F357 | Supabase schema — users/decks/games | P1 | M | todo |
| F358 | Local ↔ cloud sync engine | P1 | L | todo |
| F359 | Anonymous local mode default (no account) | P0 | S | done |
| F360 | Account upgrade claims local data | P1 | M | todo |
| F361 | Multi-device sync | P1 | L | todo |
| F362 | Realtime deck sharing via Supabase | P2 | M | todo |
| F363 | Opt-in cloud backup | P1 | M | todo |
| F364 | Migration localStorage → IndexedDB → cloud | P1 | M | todo |
| F365 | Data-schema versioning + migrations | P1 | M | todo |
| F366 | API pagination + caching | P2 | S | todo |
| F367 | Edge/Fluid function tuning | P2 | S | todo |
| F368 | Server soft-delete + restore | P2 | S | todo |

### C8 · DevEx & docs
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F369 | Architecture decision records (ADRs) | P1 | S | todo |
| F370 | One-command contributor setup | P1 | S | todo |
| F371 | API docs (OpenAPI) | P2 | M | todo |
| F372 | Component / design-system docs | P2 | M | todo |
| F373 | CODEOWNERS + PR templates | P1 | S | todo |
| F374 | Issue templates + labels | P1 | S | todo |
| F375 | Automated in-app changelog | P2 | S | todo |

---

## D. Growth, Social & Monetization (F376–F500)

### D1 · Accounts & auth (optional layer)
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F376 | Email magic-link login | P1 | M | todo |
| F377 | OAuth (Google/Apple) | P1 | M | todo |
| F378 | Guest → account upgrade flow | P1 | M | todo |
| F379 | Profile page + avatar upload | P1 | M | todo |
| F380 | Account settings/preferences sync | P1 | M | todo |
| F381 | Self-serve account deletion | P0 | S | todo |
| F382 | Email verification | P1 | S | todo |
| F383 | Passkeys (WebAuthn) | P2 | M | todo |
| F384 | Session/device management | P2 | M | todo |
| F385 | Friends / connections | P2 | M | todo |
| F386 | Per-profile privacy controls | P1 | S | todo |
| F387 | Username system + uniqueness | P1 | S | todo |
| F388 | Player skill self-rating (DUPR-style) | P2 | S | todo |
| F389 | Link DUPR account (stretch) | P2 | L | todo |
| F390 | Org / club accounts | P2 | L | todo |
| F391 | Role-based access (organizer/member) | P2 | M | todo |
| F392 | Invite teammates by link | P2 | S | todo |

### D2 · Sharing & virality
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F393 | Share match-result image (OG) | P1 | M | todo |
| F394 | Share custom-deck link | P1 | S | todo |
| F395 | Dynamic OG images per deck/match | P1 | M | todo |
| F396 | "Challenge a friend" link | P2 | M | todo |
| F397 | Referral program | P2 | M | todo |
| F398 | Embeddable scoreboard widget | P2 | M | todo |
| F399 | Social-media share templates | P2 | S | todo |
| F400 | Copy-to-clipboard share codes | P1 | S | todo |
| F401 | QR codes for decks/sessions | P1 | S | todo |
| F402 | Shareable session join link | P1 | M | todo |
| F403 | Public deck gallery | P2 | M | todo |
| F404 | Deck of the week | P2 | S | todo |
| F405 | User-submitted card suggestions | P2 | M | todo |
| F406 | Upvote / rate community decks | P2 | M | todo |
| F407 | Trending decks | P2 | M | todo |
| F408 | Share-to-stories (vertical card) | P2 | S | todo |
| F409 | Printable score sheets | P1 | S | todo |
| F410 | Brand watermark on shared images | P2 | S | todo |

### D3 · Multiplayer & realtime
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F411 | Realtime shared scoreboard (multi-device) | P2 | L | todo |
| F412 | Live spectator view | P2 | M | todo |
| F413 | Host controls + join via code | P2 | M | todo |
| F414 | Live court session for organizers | P2 | L | todo |
| F415 | Realtime roster updates across devices | P2 | M | todo |
| F416 | Remote draw sync between phones | P2 | M | todo |
| F417 | Live tournament-bracket updates | P2 | M | todo |
| F418 | Push score to TV via 2nd device | P2 | M | todo |
| F419 | Presence (who's online in session) | P2 | S | todo |
| F420 | Chat / reactions in live session | P2 | M | todo |
| F421 | Conflict-free score merge (CRDT) | P2 | L | todo |
| F422 | Reconnect / resume live session | P2 | M | todo |
| F423 | Latency / connection indicator | P2 | S | todo |
| F424 | Spectator-count display | P2 | S | todo |
| F425 | Live leaderboard during event | P2 | M | todo |
| F426 | Organizer multi-court live dashboard | P2 | L | todo |
| F427 | Audience reactions / cheers | P2 | S | todo |
| F428 | Live commentary feed (commentator cards) | P2 | M | todo |

### D4 · Leaderboards & community
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F429 | Global leaderboard (opt-in) | P2 | M | todo |
| F430 | Club / local leaderboards | P2 | M | todo |
| F431 | Seasonal rankings + resets | P2 | M | todo |
| F432 | Shareable achievements / badges | P2 | M | todo |
| F433 | Public player-profile pages | P2 | M | todo |
| F434 | Follow players / clubs | P2 | M | todo |
| F435 | Activity feed | P2 | M | todo |
| F436 | Community forum / discussions link | P2 | S | todo |
| F437 | Events calendar (find games) | P2 | L | todo |
| F438 | Find players near me (opt-in) | P2 | L | todo |
| F439 | Club directory | P2 | M | todo |
| F440 | Match check-in social posts | P2 | M | todo |
| F441 | Weekly recap email (opt-in) | P2 | M | todo |
| F442 | Streak / leaderboard notifications | P2 | S | todo |
| F443 | Community challenges / quests | P2 | M | todo |
| F444 | Card-creation contests | P2 | M | todo |
| F445 | Moderation tools for UGC | P1 | M | todo |
| F446 | Reputation system | P2 | M | todo |

### D5 · Engagement & notifications
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F447 | Web push notifications | P2 | M | todo |
| F448 | Daily-challenge reminder | P2 | S | todo |
| F449 | Streak-keeper reminders | P2 | S | todo |
| F450 | Re-engagement campaigns | P2 | M | todo |
| F451 | In-app announcement system | P2 | S | todo |
| F452 | Email digests (opt-in) | P2 | M | todo |
| F453 | Calendar integration (add session) | P2 | S | todo |
| F454 | Reminders for scheduled sessions | P2 | S | todo |
| F455 | "Your turn / on deck" notifications | P1 | S | todo |
| F456 | Notification-preferences center | P1 | S | todo |
| F457 | Achievement-unlock notifications | P2 | S | todo |
| F458 | Quiet hours for notifications | P2 | S | todo |
| F459 | Localized notification copy | P2 | S | todo |
| F460 | A/B-test framework | P2 | M | todo |
| F461 | Feature-flag system (gradual rollout) | P1 | M | todo |
| F462 | Remote config | P2 | M | todo |

### D6 · Monetization
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F463 | Free-tier definition | P1 | S | todo |
| F464 | Pro subscription (Stripe) | P2 | L | todo |
| F465 | Premium-deck marketplace | P2 | L | todo |
| F466 | One-time deck purchases | P2 | M | todo |
| F467 | Remove-ads option (if ads) | P2 | S | todo |
| F468 | Org / club paid plans | P2 | L | todo |
| F469 | Paid tournament-hosting feature | P2 | M | todo |
| F470 | Creator revenue share for decks | P2 | L | todo |
| F471 | Gift subscriptions | P2 | S | todo |
| F472 | Promo codes / coupons | P2 | S | todo |
| F473 | Stripe billing portal | P2 | M | todo |
| F474 | Trial-period handling | P2 | S | todo |
| F475 | Dunning / failed-payment recovery | P2 | M | todo |
| F476 | Tax / VAT handling | P2 | M | todo |
| F477 | Pricing page | P2 | S | todo |
| F478 | Non-intrusive paywall UX | P2 | M | todo |
| F479 | Entitlements / feature-gating service | P2 | M | todo |
| F480 | Refund / cancel self-serve | P2 | S | todo |

### D7 · Marketing & content
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F481 | Marketing landing page | P1 | M | todo |
| F482 | SEO meta + structured data | P0 | S | wip |
| F483 | Sitemap + robots.txt | P0 | S | done |
| F484 | Blog / content section | P2 | M | todo |
| F485 | Card-category SEO pages | P2 | M | todo |
| F486 | App-store listings (TWA/Capacitor wrap) | P2 | L | todo |
| F487 | Press kit | P2 | S | todo |
| F488 | Testimonials / social proof | P2 | S | todo |
| F489 | Newsletter email-capture (opt-in) | P2 | S | todo |
| F490 | Product Hunt launch assets | P2 | S | todo |
| F491 | Demo video | P2 | M | todo |
| F492 | Sitewide open-graph defaults | P0 | S | done |
| F493 | Canonical URLs | P1 | S | done |
| F494 | Conversion analytics goals | P2 | S | todo |
| F495 | Cookie consent + preferences | P1 | S | todo |
| F496 | Localized landing pages | P2 | M | todo |
| F497 | In-app NPS / feedback survey | P2 | S | todo |
| F498 | Public changelog / roadmap board | P2 | S | todo |
| F499 | Affiliate / partner program | P2 | M | todo |
| F500 | Brand-assets + logo-variants kit | P2 | S | todo |

---

## Suggested build order (the loop)

Each loop iteration: pick top unstarted `P0`, branch, implement, test, commit, mark `done`, repeat.

**Wave 1 — Don't-ship-without (P0 foundation)**
Testing + CI: F268, F269, F273, F274, F275 · Security: F327, F328, F329, F331, F332, F333, F334 · Observability: F291, F292 · Legal/SEO: F244, F245, F482, F483, F492 · A11y core: F141–F145, F150, F232 · Core UX: F126, F129, F131, F218, F219, F228 · PWA: F345 · Data: F359.

**Wave 2 — Core product depth (P0/P1)**
Shuffle engine F093–F097 · Scoring fixes F063, F065 · Tests F251–F255, F258 · Perf F310 · Hybrid sync foundation F357, F358.

**Wave 3 — Growth & polish (P1)**
Onboarding depth, deck builder F037–F048, sharing F393–F402, i18n F163–F165, accounts F376–F381.

---

## E. Card Content & Readability (F501–F550)

Make the 1,729 cards genuinely fun to read, with real description and depth.

### E1 · Writing quality
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F501 | Rewrite originals' commentary in true caller voice (stop duplicating effect) | P0 | S | done |
| F502 | Add a richer `detail` description to every card | P0 | M | done |
| F503 | Strategy "how to win it" tip line per card | P1 | M | done |
| F504 | Vary commentator hooks/stingers to cut repetition | P1 | S | done |
| F505 | Plain-words difficulty/skill-level label | P1 | S | todo |
| F506 | "Why it's fun" flavour line | P2 | S | todo |
| F507 | Equipment/setup note where relevant | P2 | S | todo |
| F508 | Safety note on physical-challenge cards | P1 | S | todo |
| F509 | Impact note (one point vs whole game) | P2 | S | todo |
| F510 | Term tooltip for jargon (erne, dink, kitchen) | P2 | M | todo |
| F511 | Reading-level pass (concise, scannable) | P1 | S | todo |
| F512 | De-duplicate similar phrasings across deck | P2 | M | todo |
| F513 | Per-card example scenario | P2 | M | todo |
| F514 | Inclusive, non-gendered language pass | P1 | S | todo |
| F515 | Emoji-free, icon-driven consistency (house rule) | P1 | S | todo |
| F516 | Tighten card names for clarity | P2 | S | todo |
| F517 | Extract card strings to i18n keys | P2 | L | todo |
| F518 | Family-safe / profanity lint on generated text | P1 | S | todo |
| F519 | Tone presets (chill / hype / coach) for text | P2 | M | todo |
| F520 | Lore / backstory for legendaries | P2 | M | todo |

### E2 · Display & interaction
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F521 | Show `detail` description on the card face | P0 | S | done |
| F522 | Show intensity as a dot meter on the card | P1 | S | done |
| F523 | Show tags as tappable chips | P2 | S | todo |
| F524 | Expandable "more" for long descriptions | P2 | S | todo |
| F525 | Text-size control for card readability | P1 | S | todo |
| F526 | High-contrast card-text mode | P1 | S | todo |
| F527 | Long-press card to open full detail sheet | P2 | M | todo |
| F528 | Card detail sheet with all metadata | P2 | M | todo |
| F529 | Copy card text to clipboard | P2 | S | todo |
| F530 | Read card aloud (TTS) with voice pick | P2 | M | todo |
| F531 | Animated reveal of detail after the name | P2 | S | todo |
| F532 | Two-column name + detail layout on tablet | P2 | S | todo |
| F533 | Graceful truncation + scroll for long text | P1 | S | todo |
| F534 | Rarity-themed typography accents | P2 | S | todo |
| F535 | Category color legend | P2 | S | todo |
| F536 | Discoverable card "info" affordance | P2 | S | todo |
| F537 | Persist last text style (concise/commentator) | P1 | S | todo |
| F538 | Auto font-scale for very long names | P2 | S | todo |
| F539 | Dark/light tuned card-text contrast | P1 | S | todo |
| F540 | Reduce-motion-friendly detail reveal | P1 | S | todo |

### E3 · Content management & quality
| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F541 | Card-content unit tests (every card complete) | P0 | S | done |
| F542 | Schema validation for cards.json in CI | P0 | S | done |
| F543 | Card-content style-guide doc | P1 | S | todo |
| F544 | Card-text linter (length, banned words) | P1 | M | todo |
| F545 | Versioned card dataset + changelog | P2 | S | todo |
| F546 | Author/source attribution for hand-written cards | P2 | S | todo |
| F547 | Report-a-card feedback wired to card id | P1 | S | todo |
| F548 | A/B variants of card phrasing | P2 | M | todo |
| F549 | Search/browse all cards with full detail | P1 | M | done |
| F550 | Export deck as printable cards (PDF) | P2 | M | todo |

---

## F. Skill Levels & Beginner Onboarding (F551–F557)

Added so beginner/intermediate players aren't overwhelmed.

| ID | Feature | Pri | Eff | Status |
|---|---|---|---|---|
| F551 | Beginner / Intermediate / Advanced on the main menu | P0 | M | done |
| F552 | Level filtering by intensity + category | P0 | S | done |
| F553 | Beginner plain-language + bigger card text | P0 | S | done |
| F554 | First-run beginner "how to play" intro | P1 | S | done |
| F555 | Skill levels in the in-game deck switcher | P1 | S | done |
| F556 | Skill-level unit tests | P1 | S | done |
| F557 | Mobile readability pass on the card face | P0 | S | done |
