# 13 — Analytics & Metrics

Modern tactical reading blends the **eye** (Chapters 00–12) with **data**. This chapter is a
reference to the metrics that matter, what each really measures, how to read it, and — just
as important — how each can mislead you.

> **Golden rule:** a metric is a *question*, not an answer. xG doesn't tell you who deserved
> to win; it tells you to go and look at the chances.

---

## 1. Chance-quality metrics

### xG — Expected Goals
The probability that a given shot is scored, based on historical shots from similar
situations (distance, angle, body part, assist type, defenders between ball and goal).

- **Read it as:** the *quality and quantity* of chances, stripped of finishing luck.
- **Use:** compare xG to actual goals. Outscoring your xG heavily = hot finishing or a great
  finisher (likely to regress); underscoring = wasteful or unlucky (likely to improve).
- **Watch out:** xG knows nothing about *who* was shooting, defensive pressure not modelled,
  or game state. A single big chance can dominate a team's xG; look at the *shot map*, not
  just the total.

### xGOT — Expected Goals on Target (post-shot xG)
The probability a shot is scored *given where it ended up* (placement and power), measured
only for shots on target.

- **Read it as:** finishing and shot-stopping quality. xGOT > xG on a shot = a well-placed
  effort; a keeper conceding fewer goals than xGOT faced = he's overperforming.

---

## 2. Threat / progression metrics

### xT — Expected Threat
Divides the pitch into a grid and assigns each zone a value (how likely a goal is *soon*
after the ball is there). Moving the ball to a higher-value zone earns positive xT.

- **Read it as:** who is *progressing* the ball into dangerous areas, even without a shot or
  assist. Credits carries and passes, not just the final action.
- **Use:** find your most threatening ball-progressors and the zones a team enters most.

### Packing / line-breaking
Counts how many opponents a pass or carry takes "out of the game" (bypasses between ball
and goal).

- **Read it as:** verticality and incisiveness. High packing = a team that breaks lines
  rather than passing sideways.

### Progressive passes / carries
Passes or carries that move the ball a meaningful distance toward goal.

- **Read it as:** who drives the team up the pitch. Useful for identifying the real
  creative hubs (often a deep playmaker, not the No. 10).

---

## 3. Pressing & defensive metrics

### PPDA — Passes Allowed Per Defensive Action
Opponent passes in their build-up zone divided by your defensive actions there. **Lower =
more aggressive pressing** (you allow few passes before challenging).

- **Read it as:** pressing intensity. A PPDA of ~8 is aggressive; ~15+ is passive/low-block.
- **Watch out:** it measures *intensity*, not *effectiveness*. A team can press furiously
  (low PPDA) and still be played through. Pair it with high turnovers won and xG conceded.

### High turnovers / high regains
Possessions won in the attacking third, and shots created shortly after.

- **Read it as:** is the press actually producing chances, or just running?

### Field tilt
Share of final-third touches (territorial dominance), often a truer "control" stat than
possession %.

- **Read it as:** who is camped in the opponent's half. A team can have 50% possession but
  70% field tilt — they have the ball where it matters.

---

## 4. Possession & control metrics

- **Possession %** — the most-quoted, least-useful stat alone. Sideways possession in your
  own half inflates it without creating anything. Always pair with field tilt and xG.
- **Pass completion %** — high numbers can mean control *or* timid sideways passing. Look at
  *where* and *how progressive* the passes are.
- **Build-up disruptions / press resistance** — how often a team is forced into turnovers
  when pressed.

---

## 5. How to combine metrics to read a game

No single number tells the story. Read them in **clusters**:

| Question | Metrics to combine |
|----------|--------------------|
| Who deserved to win? | xG + shot map + big chances + xGOT |
| Who controlled it? | Field tilt + xT + final-third entries (not just possession %) |
| Was the press working? | PPDA **and** high turnovers won **and** xG conceded |
| Is a player's form real or luck? | Goals vs. xG; xGOT vs. xG; sample size |
| Who progresses the ball? | Progressive passes/carries + packing + xT |

### Worked example
> *Team A: 62% possession, 0.9 xG. Team B: 38% possession, 1.8 xG from 3 high turnovers,
> field tilt 45%.*
> **Reading:** A had the ball but not the dangerous areas (low xG despite possession);
> B sat off, pressed in bursts, and manufactured better chances in transition. The
> scoreline will probably flatter whoever finishes; the *process* favours B's plan. Expect A
> to need a different idea (more verticality, better rest defence to stop those turnovers).

---

## 6. Cautions — how metrics lie

- **Small samples.** One match of xG is noisy; trends need ~10+ games.
- **Game state.** A team 2-0 up sits back; its second-half xG collapses by design, not
  decline. Always split by score line.
- **Context blindness.** Models don't see a defender's positioning error or a tactical
  mismatch — the things this encyclopaedia teaches you to *see*.
- **Goodhart's law.** When a metric becomes a target, it stops measuring well (e.g. teams
  that farm low-value possession to look "dominant").

> **Best practice:** let the data tell you *where to look*, then use the eye and the
> framework (Ch. 10) to explain *why*. Numbers find the question; tactics answer it.

---

### Next
→ [14 — Opposition Analysis & Game-Planning](./14-opposition-analysis.md)
