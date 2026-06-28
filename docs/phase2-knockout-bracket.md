# Phase 2 — Knockout Bracket Prediction (Design Spec)

Status: **proposed / awaiting approval** · No code written yet.

## 1. Goal

Add a second, **fully separate** prediction phase covering the **Round of 32 → Final**.
It is a personal-bracket game: each player fills out their own bracket end to end
(winners + scores for every knockout match), their picks propagate forward visually,
and they finish by crowning a champion. It must not touch the live group-stage
predictions in any way (new models, new pages, new leaderboard).

## 2. Participation & entry

- New **paid** opt-in, independent of the group stage. Anyone — existing players or
  brand-new users — can join phase 2, and not joining phase 1 is fine.
- Reuses the existing entry + payment-confirmation flow (report payment → admin
  confirms), but as a distinct **`KnockoutEntry`** so it never mixes with group-stage
  entries or standings.

## 3. Prediction locking

- Single global deadline, reusing the existing `PREDICTIONS_DEADLINE` variable (no new
  deadline mechanism). All knockout picks lock at once.
- The deadline value should be set to just before the Round of 32 kicks off
  (R32 starts **June 28, 2026**; group stage ends ~**June 27**). After group results
  are in, R32 teams are known and players fill the whole bracket before lock.

## 4. Scoring

Per knockout match, scored by **bracket position** (see §5):

| Outcome | Points |
|---|---|
| Exact score | **3** |
| Correct advancing team only (regular time **or** penalties) | **1** |
| Otherwise | 0 |

- Exact replaces the winner point (does not stack) — max 3 per match, same spirit as
  the group stage.
- "Advancing team" is the team that goes through. When a player predicts a tie, they
  must pick who advances; that pick is what the winner point checks against.
- Edge rule (kept simple): an exact tie score (e.g. 1-1) scores 3 even if the player
  picked the wrong penalty side.

### Champion bonus

- A **separate bonus** is added when the player's predicted champion equals the actual
  champion, on top of the final-match score.
- Bonus = **+2 points**, configurable via env (e.g. `KNOCKOUT_CHAMPION_BONUS`).

## 5. Position-based scoring (how personal brackets map to reality)

Each player's later-round matchups are their own (their France beats their Spain in the
R16). To score consistently, every **real** knockout match is scored by its fixed
**bracket position** (R32 match 73, …, R16 match 89, …, Final 104):

- **Winner point (1):** the player's advancing **team** for that position equals the
  actual advancing team for that position (compared by real team identity).
- **Exact score (3):** the player's predicted scoreline for that position equals the
  actual scoreline, compared by structural slot (top feeder vs bottom feeder).

This is always scoreable in every round, regardless of whether the player's predicted
teams match the real ones.

## 6. Bracket resolution (filling in real teams)

Two layers, both **auto-resolved with admin override** (admin can correct any team if
the system ever gets it wrong):

1. **Group stage → Round of 32**
   - Compute group standings; take 1st and 2nd of each of the 12 groups.
   - Rank all 12 third-placed teams (points → goal difference → goals scored → further
     FIFA tiebreakers) and take the **best 8**.
   - Apply FIFA's **Annexe C** assignment table (the 495 precomputed combinations) to
     drop each qualifying third into its correct R32 slot. The seed already encodes the
     candidate groups per slot (e.g. match 74 = `1E vs 3ABCDF`).
2. **Knockout progression**
   - As each real knockout match finishes, its winner auto-fills the next real position
     (`W74` → match 89, etc.). Used for displaying the real bracket as it unfolds and
     for scoring advancing teams.

Note: implementing Annexe C requires baking in the official assignment table; sourced
from FIFA / Wikipedia. Admin override is the safety net you asked for.

## 7. Data model (new collections; group stage untouched)

- **`KnockoutEntry`** — mirrors the existing `Entry`: `{ user, entryNumber, status,
  paymentStatus, paymentNote, ... }`.
- **`KnockoutPrediction`** — `{ entry, user, position (matchNumber/stage), score1,
  score2, advancingSide ('team1' | 'team2'), points }`.
  - `score1`/`score2` are aligned to the position's top/bottom feeder slot.
  - `advancingSide` records who the player advances; for decisive scores it's implied,
    for ties it's their explicit pick. The actual **teams** shown in each position are
    derived by walking the player's bracket forward from the R32.
- **`Match`** (reused for actual results) gains a few fields for knockout outcomes:
  `penaltyWinner ('team1' | 'team2' | null)`, `decidedOnPenalties (bool)`. Resolved
  `team1`/`team2` already exist on the schema.

## 8. Pages / UI

- **Knockout predictions page** — an interactive bracket: R32 with real teams, picks
  propagate visually into R16 → QF → SF → Final, ending with the champion. Score inputs
  per match; a winner selector when a tie is entered.
- **Knockout standings page** — separate leaderboard for phase 2 only.
- **Admin** — assign/override knockout match teams; enter knockout results + penalty
  winner; confirm phase-2 payments.
- New i18n keys (EN/ES), consistent with the existing style.

## 9. Out of scope / assumptions (flag if wrong)

- **Third-place playoff (match 103)** is **included** as a scored position. In a
  player's bracket it's contested by their two predicted semi-final losers
  (`L101` vs `L102`), scored like any other match (3 exact / 1 correct winner).
- Champion bonus = +2 (configurable).
- Phase-2 leaderboard is independent; it does not merge with group-stage points.

## 10. Open items before build

1. Confirm `PREDICTIONS_DEADLINE` is (or will be) set to just before R32 kickoff.
