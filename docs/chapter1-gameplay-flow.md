> **22 September checkpoint:** Election staging and all three outcome branches are implemented. Both supporters guarantee a win. See [current review and outcome contract](chapter1-review-220926.md), which supersedes earlier “next: election” notes and narrow-win rules below. Human visual/playtest review and dedicated Ludo.ai action exports remain.

# Chapter 1 Gameplay Flow Contract

> **22 October current revision:** see [current script](chapter1-script-2026-10-22.md) for the owner-approved photograph puzzle, Pepa music favor, separate poster and Tony-diploma route. These replace the old bills/envelope recipe below. New local gameplay is under review; Tony's collapse artwork and release verification remain pending.

## Completion pass — 16 September 2026

The [reconciled completion plan](chapter1-completion-plan-160926.md) defines the
approved target scenario. The opening/campaign, receipt investigation, Mayor
validation, clerk registration and archive exchange are now playable. The
implementation sections dated 16 September below supersede the historical
graybox route diagrams and milestone descriptions. The mehana cellar no longer
awards a ballot box. Support quests remain optional; final election staging is
the next implementation milestone.

## Status

This document is the canonical implemented graybox progression contract for Chapter 1. All story
gates, quests, recoverable failure routes, and election outcomes described here are playable.

Implementation checkpoint: completed and confirmed through an end-to-end public-server playthrough on
2026-08-23. The next production phase is replacing remaining graybox and debug presentation with reviewed
high-resolution artwork and animation; Chapter 2 remains out of scope.

It does not lock final dialogue, joke wording, puzzle props, or art. Major new player-facing content
still requires the Bulgarian satire intake pass before it is authored.

## Chapter Goal

Bai Mitko must become a legally presentable candidate, collect enough local support to have a chance,
recover the missing ballot box, survive a journalist interview, and attend the village election
before his creditors catch up with his new public identity.

The player may reach the election with a weak campaign and lose. Chapter completion means resolving
the election, not necessarily winning it.

## Baba support: fountain repair

Ask Baba about her vote, inspect the fountain, and ask the Old Men on the bench.
Take sunflower oil from the mehana, use it on the fountain, then Use the fountain
to turn the lubricated valve. Visible water confirms success. Tell Baba about the
repair to earn her vote and complete `quest.chapter1.baba_vote` once. Discovery
can happen in a different order; clues are guidance rather than artificial gates.

Gifts no longer buy her vote or damage trust. They are returned with repair hints.
If the oil was consumed, ask Kiro for a replacement. A bottle already carried or
dropped prevents duplicates. Existing saves keep already-earned votes; finished
elections do not reopen the support quest. The journal tracks diagnosis, oil,
operation and reporting; repeated failed valve use supplies a stronger hint.

## Canonical Player Flow

```text
Apartment introduction
        |
        v
Village Square hub <------> Mehana
        |                      |
        |                      +-- Tony support route
        +-- Baba support route
        +-- Fake diploma route
        |
        v
Municipality
        |
        +-- credentials check
        +-- clerk / stamp / archive sequence
        +-- missing ballot-box investigation
        |
        v
Ballot box recovered
        |
        v
Journalist encounter
        |
        v
Election Booth
        |
        +-- convincing win
        +-- narrow win
        +-- loss
```

The apartment, square, and mehana remain freely revisitable until the player commits to the election
result. Baba, Tony, and diploma progress can be pursued in parallel. Municipality access is the first
hard story gate.

## Stage Contract

| Stage | Required player result | Quest behavior | Exit condition |
| --- | --- | --- | --- |
| 1. Apartment | Learn the campaign situation and collect useful objects | Main, fake-diploma, and Tony quests retain their current fresh-save activation | Village square becomes reachable immediately |
| 2. Square hub | Discover Baba, public campaign surfaces, municipality, and mehana | Baba quest starts through her first vote conversation | Player chooses support, diploma, or mehana routes in any order |
| 3. Support routes | Secure zero, one, or both named supporters | Baba and Tony quests complete independently | Support is not a hard municipality gate, but strongly affects the result |
| 4. Candidate credentials | Produce `item.fake_diploma` | Complete `quest.chapter1.fake_diploma` | Diploma satisfies the municipality credentials check |
| 5. Municipality | Pass the clerk and discover the missing ballot-box problem | Start `quest.chapter1.ballot_box` from an authored municipal clue | Persistent clue identifies the recovery route |
| 6. Ballot recovery | Recover and return/control the ballot box | Complete `quest.chapter1.ballot_box` | Journalist encounter becomes available |
| 7. Journalist | Answer the interview and accept its meter consequences | Start and complete `quest.chapter1.journalist` during the encounter | Every answer branch completes the interview; none causes a dead end |
| 8. Election Booth | Resolve the election from saved campaign state | Complete `quest.chapter1.main` | Set ending and Chapter 1 completion state |

### Tony Support Route

1. Tony proposes a glass-for-glass drinking contest and explicitly says he will watch Bai Mitko's
   glass as procedural oversight.
2. Accepting starts the contest. Refusing safely defers it, reveals an optional clue from Kiro, and
   leaves the same challenge available for later acceptance.
3. Kiro explains that an old wedding tune makes Tony close his eyes and sing. The accordion therefore
   creates a readable distraction rather than an unexplained item combination.
4. While Tony is distracted, the player selects the carried water, chooses Use, and targets the
   explicitly labelled `Чашата на Бай Митко` / `Bai Mitko's Rakia Glass` on the left side of the table.
   The water is not used on Tony or on Tony's glass. Using it on Mitko's glass too early is noticed once
   but does not consume the water or make the quest impossible.
5. The successful swap advances the visible quest objective to finishing the challenge but does not award
   the vote by itself. Talking to Tony again and choosing the finish-challenge response awards his vote,
   completes `quest.chapter1.tony_vote`, and removes both contest glasses from interaction.

The accordion remains usable outside this solution. Bai Mitko, Baba, Kiro, generic NPCs, and future
targets tagged `animal` receive authored non-consuming reactions. Tony's challenge-specific reaction
takes priority over the generic NPC response only after the challenge has started.

### Fake Diploma Route

1. The outstanding objective first directs the player to official-looking paper. Bai Mitko takes the
   unpaid bills from the apartment table.
2. The objective advances to an envelope with administrative potential. A one-time empty-envelope
   hotspot is available among the papers at the village news kiosk.
3. With both components in inventory, the objective explicitly says to combine them. The player may
   select either component, choose Use, and click the other inventory item.
4. Assembly consumes both components, creates `item.fake_diploma`, adds four Suspicion, and completes
   `quest.chapter1.fake_diploma`.
5. Wrong combinations and dropped components do not consume either unique component. The normal dropped-
   item recovery system remains available until assembly succeeds.

The paper-combination route remains available as a fallback, but producing a
diploma no longer completes registration. Follow the receipt/Mayor/clerk route
below. The clerk then directs Mitko to the archive close-up, described below.
Recovery enables the journalist’s final interview and the existing election gate.

## Quest Roles

### Required story quests

- `quest.chapter1.main`: active from a fresh save; completes only when an election result is recorded.
- `quest.chapter1.fake_diploma`: active from a fresh save; gates meaningful municipality progress.
- `quest.chapter1.ballot_box`: activates from a municipality clue; gates the journalist and finale.
- `quest.chapter1.journalist`: activates when the recovered ballot-box path is resolved; every interview
  outcome completes it.

### Support quests

- `quest.chapter1.baba_vote`: activates when Baba states her terms.
- `quest.chapter1.tony_vote`: retains its current fresh-save activation.

Support quests improve the election outcome but do not prevent the player from reaching a losing
ending. Unfinished support quests expire narratively when the player commits to the final result; they
must not remain actionable after Chapter 1 is complete.

## Story Gates

### Municipality gate

The fake diploma is required to pass the credentials check. A failed check provides a clear hint and
returns control immediately. It does not consume an item or raise Suspicion repeatedly from the same
unchanged attempt.

### Journalist gate

The journalist appears only after the ballot-box route is resolved. The encounter always has a valid
answer. Answers change campaign state but cannot permanently block the finale.

### Election gate

The election result is available when all of the following are true:

- `quest.chapter1.fake_diploma` is complete;
- `quest.chapter1.ballot_box` is complete;
- `quest.chapter1.journalist` is complete.

Baba and Tony support are deliberately not hard gates. Entering the result with neither supporter is
allowed and should normally produce a loss.

## Meter Contract

- **Influence** represents committed political leverage. Support quests are its primary source.
- **Suspicion** represents accumulated evidence that Bai Mitko's campaign is improvised beyond the
  accepted local tolerance. It should rise through visibly dubious choices, not ordinary exploration.
- **Public Mood** represents how entertaining, hopeful, or tolerable the campaign appears to the
  village. It may differ from direct support.
- **Rakia glasses** affect moment-to-moment presentation and selected puzzle choices, but intoxication
  alone never permanently blocks Chapter completion.

Meters remain clamped to their existing ranges. Failed interactions must not be infinitely repeatable
meter farms or penalties.

## Election Outcomes

Outcome rules are evaluated in the following order so the first match wins. Exact values remain
content data rather than engine conditionals.

### `ending.chapter1.convincing_win`

Requirements:

- both `babaStoyankaVote` and `tonyVote` are true;
- Influence is at least 40;
- Suspicion is at most 35;
- Public Mood is at least 55;
- all election-gate quests are complete.

Result:

- `chapter1Completed = true`
- `wonMunicipalSeat = true`
- `mayorDefeated = true`
- `quest.chapter1.main` completes

### `ending.chapter1.narrow_win`

Requirements:

- at least one of `babaStoyankaVote` or `tonyVote` is true;
- Influence is at least 15;
- Suspicion is at most 70;
- Public Mood is at least 35;
- all election-gate quests are complete.

Result:

- `chapter1Completed = true`
- `wonMunicipalSeat = true`
- `mayorDefeated = true`
- `quest.chapter1.main` completes

### `ending.chapter1.loss`

Requirements:

- the election gate is satisfied;
- neither win outcome matched.

Result:

- `chapter1Completed = true`
- `wonMunicipalSeat = false`
- `mayorDefeated = false`
- `quest.chapter1.main` completes

The loss is a completed story outcome, not a game-over reset. The ending may offer Restart Chapter and
Return to Main Menu.

## Recoverable Failure Rules

- Baba support comes from fountain repair regardless of legacy damaged-trust values.
  Kiro replaces consumed oil; dropped oil remains recoverable in its scene.
- Tony's challenge remains retryable until his vote is secured; refusal or a failed trick cannot make
  the quest permanently impossible.
- Failed diploma assembly does not destroy unique required components.
- The municipality always allows a return to the square.
- Ballot-box clues remain available after first discovery.
- Every journalist branch reaches an interview result.
- Meter changes may worsen the ending but never prevent the election gate from being satisfied.
- Intoxication always has at least one available recovery method.
- No required item can be permanently lost through the inventory-drop system.

## Final Commitment

Starting the election result is the Chapter 1 point of no return. The UI must warn the player that
unfinished support business will be left unresolved. On confirmation, the game saves before resolving
the outcome.

After resolution:

- the ballot box is transferred out of inventory and `ballotBoxDelivered` is persisted;
- the ending ID is persisted;
- the main quest and Chapter 1 completion state are persisted before the ending UI appears;
- reload returns to the resolved ending or post-result state instead of rerunning effects;
- Chapter 2 is not started or implied as implemented.

## Out Of Scope For The Graybox Milestone

- final scene paintings and foreground extraction;
- final NPC animation coverage;
- voice acting, music, and sound design;
- Chapter 2 content;
- a large topical-joke or final-art batch;
- changing the 1280x720 resolution or custom canvas renderer.

## Acceptance Status

The graybox gameplay milestone is complete. The automated suite covers all three election outcomes,
recoverable puzzle routes, bilingual finale keys, and ending persistence. A Playwright browser smoke
test also runs the required diploma, municipality, ballot-box, journalist, and election path from a
fresh save, then reloads the persisted ending. As of 2026-09-04, `npm test` passes all 201 tests.
Final-art acceptance remains a separate milestone.

## Registration replacement — 16 September 2026

This section supersedes the older self-service seal progression above.

1. Obtain diploma and pamphlets at the kiosk (legacy bills/envelope crafting is
   still accepted). Creating the diploma no longer completes its quest.
2. Post pamphlets. Journalist appears by the kiosk; municipal entry opens.
3. Win Tony's challenge for support and the receipt, or ask the journalist what
   evidence she needs and request the same expense record from Kiro. Carried,
   dropped and already-delivered receipts cannot be duplicated.
4. Give the receipt to the journalist. She leaves the square for the office.
5. Show the diploma to the clerk, before or after collecting the receipt. She
   checks it but cannot register Mitko without the Mayor's validation.
6. Enter the Mayor's office with the diploma. The journalist is visibly present.
   Talk: expense question → explanation → reject the minor post → paper stack →
   Mayor stamps. This sets mayorDiplomaStamped, not registration.
7. Return the diploma to the clerk. She registers Mitko, completes the diploma
   quest, and directs him to the archive. The reporter returns to the square.

The old seal is now a scene prop; even a legacy inventory seal cannot complete
registration. Existing registered saves retain their earned registration; older
paper-creation-only saves regain the unfinished diploma quest. Finished endings
are not reopened. Save/reload preserves the reporter's location and validation.

The archive close-up below replaces cellar recovery. The post-recovery final
interview remains playable until the finale staging milestone. The stamping moment is presently
staged through dialogue and persistent state; dedicated animation remains art
production work. No supporter quest is a registration gate.


## Archive implementation — 16 September 2026

1. After clerk registration, Use the right-hand archive cabinet. It opens
   `scene.chapter1.archive`, a fixed close-up. Click the open drawer’s front handle to return to Penka.
2. Look at the jammed handle to discover the strap clue. Use the closed handle
   to step back to Penka if you need to fetch the accordion.
3. Use `item.accordion` on the handle. The drawer opens; the accordion is retained.
4. Look at or Use the ledger. One transparent seasonal container must remain in
   the designated storage position; an equivalent replacement is allowed.
5. Take `item.pickle_jar`, then Use it on the empty `item.ballot_box`.
6. Take the released box. Complete the ballot-box quest and continue with the
   journalist’s final interview in the square.

The jar is visibly removed when taken and reappears in the designated storage
area after placement. It cannot be taken back. The box disappears only when
collected. Reloads retain each stage. The clerk offers the next relevant hint.

No invisible items can be dropped into the close-up: step back into the hall to
drop baggage. A jar dropped elsewhere remains in that room’s recoverable pile
and cannot respawn in the cabinet. Existing legacy boxes, including dropped
ones, preserve recovery and registration. The old cellar IDs remain retired,
so a legacy cellar-open flag never creates a second box.

Opening and exchange use painted state changes. Dedicated character action
animation is still a presentation task, as is the Mayor’s stamping animation.
