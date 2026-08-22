# Comrade Candidate — Authoritative Chapter 1 Script v1.0

Status: Authoritative Chapter 1 design baseline  
Version: 1.0

Future implementation may polish dialogue, jokes, visuals, and optional interactions, but changes to mandatory quest dependencies, canonical puzzle solutions, scene progression, the Mayor objective, or stable IDs require explicit review.

Design and implementation-planning document for final review.

Labels:

- **REPO FACT** — already established in the repository.
- **LOCKED SCRIPT DECISION** — canonical Chapter 1 design.
- **IMPLEMENTATION NOTE** — guidance for implementation.

## 1. Chapter 1 summary

### Premise

**REPO FACT**

Bai Mitko is broke, owes money, owns an accordion, and enters local politics. The existing main quest is to win the village election before his creditors find him.

**LOCKED SCRIPT DECISION**

Bai Mitko is running specifically for **Mayor**.

On election morning, the television announces an unusually compressed local election:

- candidate registration takes place during the day;
- voting happens that evening;
- there is no real-time countdown or timed failure.

The incumbent Mayor presents this as “reducing the period of democratic uncertainty.”

### Bai Mitko’s motivation

Mitko’s unpaid bills are due and a creditor is looking for him. The Mayor’s position offers:

- a salary;
- a heated office;
- an official telephone;
- the ability to describe personal financial disasters as inherited municipal problems.

His initial motivation is selfish and practical. During the chapter, he accidentally becomes credible by completing one visible public repair and navigating the Mayor’s broken system more effectively than the Mayor.

### Main objective

Prepare Bai Mitko’s campaign, gain Baba Stoyanka’s and Tony’s support, register as a mayoral candidate, recover the missing ballot box, and defeat the incumbent Mayor.

### Tone

The chapter is:

- absurdist;
- deadpan;
- visually playful;
- character-driven;
- bureaucratically surreal;
- cynical about institutions but affectionate toward human weakness.

Mitko is dishonest in small, funny, survivable ways. The Mayor is defeated by his own vanity and bureaucracy.

## 2. Canonical story flow

1. **Apartment**
   - Election announced.
   - Main objective begins.
   - Take unpaid bills.
   - Take accordion.
   - Leave for the Square.

2. **Village Square**
   - Read election notice.
   - Meet Baba, Old Men Chorus, and kiosk operator.
   - Learn about candidate paperwork.
   - Turn unpaid bills into a fake diploma and campaign pamphlets.
   - Post campaign material.
   - Journalist appears.

3. **Baba support**
   - Baba demands one small completed action.
   - Old Men identify the fountain problem.
   - Obtain sunflower oil from the Mehana.
   - Repair fountain valve.
   - Gain Baba’s support.

4. **Tony support**
   - Accept drinking challenge.
   - Obtain water.
   - Distract Tony with accordion.
   - Replace Mitko’s own drink.
   - Gain Tony’s support.
   - Obtain suspicious municipal receipt.

5. **Journalist**
   - Reacts to Mitko’s completed actions.
   - Examines the suspicious receipt.
   - Goes to the Municipality for the Mayor’s explanation.

6. **Municipality**
   - Campaign visibility gets Mitko past the Guard.
   - Clerk rejects unstamped diploma.
   - Journalist confronts Mayor about receipt.
   - Mayor accidentally stamps Mitko’s fake paperwork.
   - Clerk registers Mitko as a mayoral candidate.

7. **Archive**
   - Registration reveals the ballot box is unavailable.
   - Open jammed archive cabinet with accordion strap.
   - Discover transparent-container classification.
   - Replace ballot box with pickle jar.
   - Recover ballot box.

8. **Election Booth**
   - Deliver ballot box.
   - Mayor raises final objections.
   - Clerk and Journalist expose contradictions in his paperwork.
   - Baba, Tony, and villagers vote.
   - Bai Mitko becomes Mayor.

9. **Chapter Complete**
   - Result state is saved.
   - Chapter 1 ends without introducing Chapter 2 or Parliament.

The Square support and preparation puzzles may be completed in different orders. The overall act structure remains fixed.

## 3. Apartment opening

### Opening event

The television announces:

- the accelerated mayoral election;
- same-day registration and voting;
- the incumbent Mayor’s confidence that no qualified opponent can register in time.

A creditor knocks at Mitko’s door. The creditor creates urgency but is not a timer or failure condition.

Mitko concludes:

**BG:** „Кметът има заплата, кабинет и служебен телефон. Аз имам три сметки и акордеон. Почти сме равни.“

**EN:** “The Mayor has a salary, an office, and an official telephone. I have three bills and an accordion. We’re practically equals.”

### Required interactions

1. Inspect the TV or campaign poster.
2. Activate `quest.chapter1.main`.
3. Take `item.unpaid_bills`.
4. Take `item.accordion`.
5. Leave for Village Square.

### Why the items matter

- The bills supply Mitko’s personal details and printing paper.
- The accordion is used in the Tony and archive puzzles.

### Optional interactions

Window, mirror, wardrobe, table, and poster provide character and tutorial flavor but do not gate progression.

### Recovery

The apartment remains accessible until the finale. Later dialogue directs the player back if either mandatory item was missed.

## 4. Village Square hub

The Square is Chapter 1’s central information and navigation hub.

### Baba Stoyanka

- Located at the bus-stop area.
- Represents traditional local credibility.
- Starts the fountain quest.
- Publicly supports Mitko after the repair.

### Old Men Chorus

- One collective NPC/hotspot.
- Acts as a humorous hint system and public reaction chorus.
- Provides the fountain clue.
- Comments on Mitko’s progress.
- Never becomes a separate quest.

### Kiosk

- Remains inside the Square scene.
- Has no separate close-up scene.
- Contains a named NPC.
- Supplies the fake diploma and campaign pamphlets.
- Explains candidate paperwork.

### Poster board

Using campaign pamphlets here:

- makes Mitko’s campaign publicly visible;
- causes the Journalist to appear;
- allows the Guard to recognize Mitko as a candidate;
- creates a visible scene change.

### Fountain

- Central object in Baba’s quest.
- Visibly changes from broken to weakly operational.
- Becomes evidence the Journalist can mention.

### Mehana

Contains:

- Tony;
- drinking challenge;
- water;
- sunflower oil;
- suspicious receipt.

### Journalist

- Appears after campaign material is posted.
- Reacts to completed actions.
- Connects Tony’s receipt to the Mayor confrontation.
- Does not create a separate investigation structure.

### Municipality entrance

- Initially blocked by the Guard.
- Opens after Mitko posts campaign material.
- This is a simple state check, not a separate puzzle.

## 5. Named kiosk NPC

**Name:** Пенка Дочева  
**Display name BG:** Леля Пенка от будката  
**Display name EN:** Aunt Penka at the Kiosk  
**Recommended stable ID:** `npc.penka_kiosk`

### Personality

Penka is:

- a former municipal typist;
- observant;
- practical;
- unimpressed by ideology;
- exact about spelling but flexible about truth;
- convinced every village crisis can be solved with paper, toner, and the correct facial expression.

She does not describe herself as a forger.

**BG:** „Дипломи не правя. Поправям липсата им.“

**EN:** “I don’t make diplomas. I correct their absence.”

### Visual and comedic role

Penka is framed by the kiosk window:

- large reading glasses;
- pencil behind one ear;
- ink-stained fingers;
- cardigan with too many pockets;
- newspapers arranged like defensive walls;
- a printer that sounds more exhausted than the electorate.

### Gameplay function

Penka:

1. explains the qualification requirement;
2. accepts Mitko’s unpaid bills;
3. uses their personal details and reverse sides;
4. produces the fake diploma;
5. prints campaign pamphlets;
6. hints that public visibility will make the Municipality acknowledge him.

### Relationship with Bai Mitko

Penka remembers Mitko from old wedding performances and unpaid poster-printing jobs. She does not trust him, but she understands him.

She helps because:

- his candidacy will generate news;
- the Mayor stopped paying for kiosk notices;
- she expects payment after the “administrative miracle.”

She is not a mandatory supporter or voter bloc.

## 6. Baba Stoyanka quest

Quest: `quest.chapter1.baba_vote`

### Setup

Mitko asks Baba for her vote.

She refuses to accept a campaign promise:

**BG:** „Не ми обещавай пет години. Оправи нещо за пет минути.“

**EN:** “Don’t promise me five years. Fix something in five minutes.”

She indicates the broken fountain.

### Clue chain

1. Baba identifies the fountain as her test.
2. Inspecting the fountain reveals a stuck, squeaking valve.
3. Old Men explain:
   - water still reaches the fountain;
   - the valve is rusted;
   - the Municipality records its squeaking as “partial operation.”
4. They suggest old cooking oil could loosen it.
5. The Mehana contains sunflower oil.

### Solution

1. Obtain `item.sunflower_oil` from the Mehana.
2. Use it on the fountain valve.
3. Operate the fountain.
4. A weak but visible stream appears.

### Reward

Baba publicly supports Mitko:

**BG:** „Не е много вода. Ама е повече от обещание.“

**EN:** “It isn’t much water. But it’s more than a promise.”

### State changes

- `babaStoyankaVote = true`
- `babaTrust = "supportive"`
- `flags.fountainRepaired = true`
- complete `quest.chapter1.baba_vote`

### Main-story effect

- Secures one mandatory support bloc.
- Improves villagers’ and Journalist’s reactions.
- Provides visible proof Mitko completed something before taking office.

## 7. Tony / Mehana quest

Quest: `quest.chapter1.tony_vote`

### Setup

Tony supports a mayoral candidate who proves sufficient “capacity.” In the Mehana, capacity is measured in glasses.

Mitko accepts the drinking challenge.

### Clues

- The water jug is visible.
- Looking at it identifies water as suspiciously sober.
- Playing the accordion reveals that Tony becomes sentimental and looks away.
- Attempting the substitution too early makes Tony explain that he watches the table during political negotiations.

### Simplified solution

1. Accept Tony’s challenge.
2. Obtain `item.glass_of_water`.
3. Use the accordion on Tony.
4. Tony turns away, remembering a waitress and a wedding from 1998.
5. Use the water on Mitko’s own drink.
6. The substitution happens automatically.
7. The drinking sequence plays.
8. Tony declares Mitko the winner.

The player does not carry or manage a separate rakia inventory item.

### Failure and retry

- Using water before distracting Tony produces a short refusal.
- Targeting Tony’s drink makes him move it and clarify the solution.
- Drinking without substituting causes a brief comic loss.
- The challenge immediately resets.
- Water can be obtained again.
- No permanent penalty blocks progress.

### Reward

Tony and the Mehana regulars support Mitko.

A suspicious receipt appears beneath Mitko’s glass. It records the Mayor’s Mehana expenses as fountain maintenance.

### State changes

- `tonyVote = true`
- `tonyFavorOwed = true`
- `swappedOwnRakiaWithWater = true`
- add `item.suspicious_receipt`
- complete `quest.chapter1.tony_vote`

## 8. Kiosk / fake diploma / campaign-material chain

Quest: `quest.chapter1.fake_diploma`

### Discovery

The election notice says a mayoral candidate needs proof of administrative competence.

Penka explains that the Municipality cares more about appearance than origin.

### Puzzle steps

1. Take unpaid bills from the apartment.
2. Speak to Penka.
3. Use `item.unpaid_bills` on the kiosk.
4. Penka extracts:
   - Mitko’s legal name;
   - his address;
   - usable paper from the reverse sides.
5. She produces:
   - `item.fake_diploma`;
   - `item.campaign_pamphlets`.
6. Use pamphlets on the poster board.
7. Mitko’s campaign becomes publicly visible.
8. Present the fake diploma to the Municipality Clerk.
9. Clerk rejects it because it lacks the Mayor’s validation.
10. During the receipt confrontation, the Mayor accidentally stamps it.
11. Clerk registers Mitko.

### Diploma identity

The diploma comes from the fictional:

> Provincial Institute of Strategic Accordion Management.

### State changes

On kiosk transaction:

- remove `item.unpaid_bills`
- add `item.fake_diploma`
- add `item.campaign_pamphlets`
- `hasFakeDiploma = true`

On posting pamphlets:

- remove or mark pamphlets as used
- `flags.campaignPosted = true`
- activate Journalist
- enable Municipality entry

On registration:

- `flags.candidateRegistered = true`
- complete `quest.chapter1.fake_diploma`

## 9. Journalist

Quest: `quest.chapter1.journalist`

The Journalist remembers what the player did and exposes contradictions. She is not a separate major puzzle chain.

### Appearance

She appears beside the poster board after:

- `flags.campaignPosted = true`

### What she checks

Her dialogue reacts to:

- whether the fountain is repaired;
- whether Baba supports Mitko;
- whether Tony supports Mitko;
- whether Mitko has the fake diploma;
- whether Mitko holds the suspicious receipt.

### Dialogue consequences

- Fountain repaired: she acknowledges one verifiable achievement.
- Baba supportive: she notes Mitko has local credibility.
- Tony supportive: she asks how Mitko survived.
- Fake diploma obtained: she asks where Mitko studied.
- Evasive answers increase pressure.
- Verifiable answers reduce pressure.

Influence, Suspicion, and Public Mood may record reactions, but the player does not need to calculate them.

### Receipt function

After Tony’s quest, show `item.suspicious_receipt` to the Journalist.

She recognizes the contradiction between:

- the Mayor’s claimed fountain spending;
- the fountain’s condition;
- the Mehana bill.

She takes the receipt and goes to the Municipality for an official response.

### State changes

- remove `item.suspicious_receipt`
- `flags.journalistHasReceipt = true`
- update `journalistSuspicionLevel`
- complete `quest.chapter1.journalist`

### Municipality and finale roles

At the Municipality:

- she demands that the Mayor explain the receipt;
- she prevents him from dismissing Mitko;
- she witnesses the accidental diploma validation.

At the finale:

- she recalls the fountain repair;
- she explains that the Mayor’s paperwork authenticated Mitko;
- she makes the Mayor’s contradictions visible.

## 10. Municipality

The Municipality has three understandable objectives:

1. gain entry;
2. become officially registered;
3. discover and recover the ballot box.

### Objective 1: Gain entry

The Security Guard blocks normal citizens during registration.

After Mitko posts campaign material, the Guard recognizes him:

> “You look like the poster, only less laminated.”

The Guard admits him.

This is a simple state check, not a separate puzzle.

### Objective 2: Become officially registered

The Clerk examines the fake diploma and rejects it because it lacks the Mayor’s stamp.

If the Journalist does not have the receipt, the Clerk points the player toward:

- the Journalist;
- the Mehana;
- the Mayor’s public-expense records.

Once the Journalist has the receipt, Mitko accompanies her into the Mayor’s office.

The Mayor places:

- the suspicious receipt;
- supporting expense papers;
- Mitko’s fake diploma

in one stack.

While declaring that every document in his administration is valid, he stamps the entire stack.

The Journalist points out that he has validated Mitko’s qualification.

The Clerk registers Mitko.

### Objective 3: Discover and recover the ballot box

After registration, the Clerk checks the election inventory.

She discovers:

> “The ballot box is physically present but electorally unavailable.”

The archive ledger classifies it as a transparent seasonal container. The Clerk directs Mitko to the archive because the archive employee position is vacant.

No additional stamp inventory or release-form puzzle is required.

### Character roles

#### Security Guard

- blocks ordinary access;
- responds to campaign status;
- provides one clear gate;
- does not require bribery or disguise.

#### Clerk

- explains requirements;
- rejects and later accepts the diploma;
- reveals the ballot-box problem;
- represents procedural authority.

#### Mayor

- obstructs candidacy;
- accidentally validates it;
- creates the ballot-box problem;
- returns as the final antagonist.

## 11. Mayor

### Personality

The incumbent Mayor:

- treats every failure as phased modernization;
- calls decay an inherited success;
- believes stamps are stronger than facts;
- fears public embarrassment more than losing office;
- tries to absorb opponents rather than confront them;
- is fictional and not based on a real politician.

### Foreshadowing

Before appearing, the Mayor is present through:

- TV announcement;
- posters;
- fountain-repair sign;
- Municipality notices;
- Mehana receipt;
- Clerk and Guard dialogue;
- Old Men commentary.

### First confrontation

The Journalist asks about the receipt.

The Mayor says the Mehana expenses were:

- public consultation;
- hospitality research;
- part of the fountain’s social-impact phase.

He offers Mitko a ceremonial minor post if he withdraws.

Mitko remains in the race.

### Accidental validation

The Mayor stamps the disputed paperwork to prove it is valid.

Mitko’s fake diploma is in the same stack.

The stamp makes the diploma administratively acceptable.

### Final confrontation

At the Election Booth, the Mayor objects to:

- Mitko’s qualifications;
- the ballot box;
- the pickle-jar replacement;
- the legitimacy of the vote.

The Clerk and Journalist answer each objection using the Mayor’s own paperwork and statements.

The Mayor defeats himself procedurally.

## 12. Ballot box / archive puzzle

Quest: `quest.chapter1.ballot_box`

### Exact clue chain

1. Mitko completes candidate registration.
2. Clerk checks election equipment.
3. Clerk discovers the ballot box is missing from active inventory.
4. She reads its classification:
   - “Transparent container.”
   - “Seasonal use.”
   - “Electoral or culinary purpose unresolved.”
5. She directs Mitko to the archive.
6. The archive cabinet is visibly jammed.
7. Looking reveals a strong handle but insufficient leverage.
8. A clue mentions the strength of Mitko’s accordion strap.
9. Use `item.accordion` on the cabinet.
10. Mitko loops the strap around the handle and pulls it open.
11. Inside are:
    - the classification ledger;
    - `item.pickle_jar`;
    - access to ballot-box storage.
12. The ledger states:
    > “One transparent seasonal container must remain in storage.”
13. Take the pickle jar.
14. Place it in the ballot box’s classified position.
15. Take `item.ballot_box`.

### Why the solution is logical

The player receives three clues:

- both objects are transparent containers;
- the classification ignores their purpose;
- one transparent container must remain.

The solution is absurd but follows the Municipality’s rules.

### State changes

- `flags.archiveOpened = true`
- move `item.pickle_jar` into archive storage
- add `item.ballot_box`
- `hasBallotBox = true`
- complete `quest.chapter1.ballot_box`

## 13. Election Booth finale

### Prerequisites

The Election Booth becomes available when:

- `flags.candidateRegistered = true`
- `babaStoyankaVote = true`
- `tonyVote = true`
- `flags.journalistHasReceipt = true`
- `hasBallotBox = true`

Completing the mandatory path guarantees Mitko can win.

### Finale sequence

1. Mitko delivers the ballot box.
2. Election workers place it in the center.
3. Baba arrives from the bus-stop area.
4. Tony arrives with Mehana regulars.
5. Old Men Chorus attends as unofficial observers.
6. Penka watches with freshly printed result paper.
7. Journalist prepares her report.
8. Mayor attempts to halt the vote.

### Mayor’s objections

#### Mitko is unqualified

The Clerk presents the diploma bearing the Mayor’s stamp.

#### The ballot box was removed improperly

The Clerk presents the transparent-container classification.

#### A pickle jar cannot replace election equipment

The Journalist asks why the Mayor’s administration classified both identically.

#### Mitko misled the public

Visible actions answer:

- the fountain works;
- Baba supports Mitko;
- Tony and the Mehana support Mitko;
- Mitko recovered the ballot box;
- the Mayor’s receipt and stamp expose his contradiction.

### How previous actions affect presentation

Mandatory quest completion determines victory.

Influence, Suspicion, and Public Mood may change:

- crowd enthusiasm;
- Journalist wording;
- Old Men comments;
- Mayor’s confidence;
- implied victory margin.

They cannot permanently prevent victory after the mandatory path is complete.

### Victory

Mitko wins a narrow majority.

State changes:

- `wonMunicipalSeat = true`
- `mayorDefeated = true`
- `chapter1Completed = true`
- complete `quest.chapter1.main`

### Ending

The former Mayor says:

**BG:** „Процесът е под контрол. Само резултатът се отклони.“

**EN:** “The process is under control. Only the result has deviated.”

Mitko’s creditors arrive and address him as “Mr. Mayor.”

Mitko looks toward the Municipality:

**BG:** „Частният дълг беше проблем. Сега вече е управленска програма.“

**EN:** “Private debt was a problem. Now it’s a governing program.”

The repaired fountain produces one final weak spurt.

**Chapter 1 Complete.**

No Chapter 2 or Parliament material follows.

## 14. Mandatory content

- TV election announcement.
- Take unpaid bills.
- Take accordion.
- Learn candidate requirements.
- Give unpaid bills to Penka.
- Obtain fake diploma and pamphlets.
- Post campaign material.
- Meet Journalist.
- Start Baba’s quest.
- Learn fountain clue.
- Obtain oil.
- Repair fountain.
- Gain Baba’s support.
- Accept Tony’s challenge.
- Obtain water.
- Distract Tony.
- Replace Mitko’s drink.
- Gain Tony’s support.
- Obtain receipt.
- Give receipt to Journalist.
- Enter Municipality.
- Present diploma.
- Confront Mayor.
- Mayor validates paperwork.
- Register as candidate.
- Discover ballot classification.
- Open archive with accordion strap.
- Exchange pickle jar for ballot box.
- Deliver ballot box.
- Complete election.
- Become Mayor.

## 15. Optional content

### Apartment

- window lines;
- mirror jokes;
- wardrobe observations;
- repeated creditor knocks;
- TV flavor reports.

### Square

- statue observations;
- election-notice jokes;
- poster archaeology;
- Old Men barks;
- Penka newspaper comments;
- bus-delay jokes;
- fountain observations.

### Mehana

- radio lines;
- goat portrait;
- Tony barks;
- décor observations;
- harmless failed drinking animations.

### Municipality

- broken ticket machine;
- plastic plant inventory tag;
- former Mayor portraits;
- absurd door labels;
- Clerk wrong-item refusals.

### Election Booth

- election-worker barks;
- crowd reactions;
- alternate Journalist phrasing;
- minor result variations.

Optional content must not alter the mandatory puzzle graph.

## 16. Inventory map

| Item | Obtained | Used | Result |
|---|---|---|---|
| `item.unpaid_bills` | Apartment | Penka’s kiosk | Produces diploma and pamphlets |
| `item.accordion` | Apartment | Tony; archive cabinet | Distracts Tony; opens cabinet |
| `item.sunflower_oil` | Mehana | Fountain valve | Repairs fountain |
| `item.glass_of_water` | Mehana jug | Mitko’s drink | Wins Tony challenge |
| `item.fake_diploma` | Penka’s kiosk | Clerk/Mayor | Becomes validated |
| `item.campaign_pamphlets` | Penka’s kiosk | Poster board | Makes campaign visible |
| `item.suspicious_receipt` | Tony’s table | Journalist | Exposes Mayor |
| `item.pickle_jar` | Archive | Ballot storage | Replaces ballot box |
| `item.ballot_box` | Archive | Election Booth | Allows election |

Declared but not mandatory:

- `item.empty_envelope`
- `item.rakia`
- `item.municipality_stamp`

These stable IDs should not be casually renamed or deleted.

## 17. Quest map

| Quest | Start | Discovery | Steps | Completion | Effect |
|---|---|---|---|---|---|
| `quest.chapter1.main` | TV announcement | Mitko must become Mayor | Complete all mandatory quests | Win election | Chapter Complete |
| `quest.chapter1.fake_diploma` | Election notice | Candidate needs qualifications | Bills → kiosk → diploma/pamphlets → poster → Mayor stamp → Clerk | Registered | Opens ballot stage |
| `quest.chapter1.baba_vote` | Ask Baba | She wants one repair | Old Men → oil → fountain | Baba supports Mitko | Required support |
| `quest.chapter1.tony_vote` | Ask Tony | Drinking challenge | Water → accordion → replace Mitko’s drink | Tony supports Mitko | Required support and receipt |
| `quest.chapter1.journalist` | Post pamphlets | Journalist checks contradictions | Talk → show receipt | Journalist confronts Mayor | Enables Mayor scene |
| `quest.chapter1.ballot_box` | Registration | Box is archived | Open cabinet → jar exchange | Obtain box | Enables finale |

## 18. Scene flow

```text
Apartment
   ↓
Village Square Hub
   ├── Baba at bus stop
   ├── Old Men Chorus
   ├── Penka’s kiosk
   ├── Poster board
   ├── Fountain
   ├── Journalist
   └── Mehana / Tony
          ↓
Municipality
   ├── Guard
   ├── Clerk
   ├── Mayor office
   └── Archive / ballot storage
          ↓
Election Booth
          ↓
Bai Mitko Becomes Mayor
          ↓
Chapter 1 Complete
```

## 19. Failure and recovery rules

Mandatory progression cannot be permanently dead-ended.

- Mandatory items cannot be permanently destroyed before use.
- Apartment remains accessible until the finale.
- Water can be obtained again.
- Tony’s challenge resets after failure.
- Wrong-item use provides clues.
- Dialogue choices cannot permanently remove required cooperation.
- Journalist pressure cannot permanently block victory.
- Influence, Suspicion, and Public Mood cannot create unrecoverable loss.
- Election Booth opens only when prerequisites are complete.
- Completing the mandatory path guarantees eventual victory.
- Save/load preserves solved states and visible changes.

Each mandatory puzzle supports:

1. environmental clue;
2. NPC suggestion;
3. direct hint after repeated failures.

## 20. Implementation status

| Major beat | Status |
|---|---|
| Election premise/main quest | PARTIALLY IMPLEMENTED |
| Apartment | PARTIALLY IMPLEMENTED |
| Take unpaid bills | ALREADY IMPLEMENTED |
| Take accordion | PARTIALLY IMPLEMENTED |
| Village Square | PARTIALLY IMPLEMENTED |
| Baba | PARTIALLY IMPLEMENTED |
| Fountain quest | MISSING |
| Old Men Chorus | PARTIALLY IMPLEMENTED |
| Penka | MISSING |
| Bills-to-diploma transaction | MISSING |
| Campaign pamphlets | PARTIALLY IMPLEMENTED |
| Poster-board campaign action | MISSING |
| Mehana | PARTIALLY IMPLEMENTED |
| Tony dialogue | PARTIALLY IMPLEMENTED |
| Tony complete puzzle | PARTIALLY IMPLEMENTED |
| Suspicious receipt | PARTIALLY IMPLEMENTED |
| Journalist | PARTIALLY IMPLEMENTED |
| Municipality | MISSING |
| Guard | MISSING |
| Clerk | MISSING |
| Mayor | MISSING |
| Candidate registration | MISSING |
| Archive cabinet | MISSING |
| Pickle jar | PARTIALLY IMPLEMENTED |
| Ballot box | PARTIALLY IMPLEMENTED |
| Transparent-container puzzle | MISSING |
| Election Booth | MISSING |
| Final confrontation | MISSING |
| Election victory | MISSING |
| Chapter Complete | PARTIALLY IMPLEMENTED |
| Influence/Suspicion/Public Mood | ALREADY IMPLEMENTED |
| BG/EN localization framework | ALREADY IMPLEMENTED |

## 21. Implementation roadmap

### PR 1 — Opening and campaign preparation

- make accordion obtainable;
- add election announcement;
- correct new-game quest activation;
- implement Penka;
- implement bills → diploma/pamphlets;
- implement campaign poster state.

### PR 2 — Baba and fountain

- add Old Men collective interaction;
- expand Baba dialogue;
- implement fountain states;
- use oil on valve;
- complete Baba quest;
- persist repaired visual state.

### PR 3 — Tony and receipt

- implement simplified challenge;
- refillable water;
- accordion distraction;
- replace Mitko’s drink;
- retry behavior;
- Tony support;
- suspicious receipt reward.

### PR 4 — Journalist and registration

- add Journalist;
- add reactive dialogue;
- accept receipt;
- create Municipality scene skeleton;
- implement Guard, Clerk, and Mayor;
- validate diploma;
- register Mitko.

### PR 5 — Archive and finale

- implement archive cabinet;
- accordion-strap action;
- pickle-jar exchange;
- ballot-box acquisition;
- create Election Booth;
- implement final confrontation;
- set victory and Chapter Complete.

## 22. Script v1.0 locked decisions

1. Bai Mitko runs for Mayor.
2. Registration and voting happen on the same day.
3. There is no real-time countdown.
4. Apartment is the opening scene.
5. Bills and accordion are mandatory apartment items.
6. Village Square is the central hub.
7. Baba remains at the bus stop.
8. Old Men Chorus is one collective NPC/hotspot.
9. Baba requires the fountain repair.
10. Sunflower oil repairs the fountain valve.
11. Kiosk remains in the Square.
12. Kiosk NPC is Penka Docheva.
13. Bills produce the fake diploma and pamphlets.
14. Posting pamphlets starts the public campaign.
15. Tony’s solution is water plus accordion distraction applied to Mitko’s own drink.
16. Tony awards the suspicious receipt.
17. Journalist is reactive and connective.
18. Receipt leads to the Mayor confrontation.
19. Mayor accidentally validates the fake diploma.
20. Clerk registers Mitko.
21. Ballot box is hidden by transparent-container classification.
22. Accordion strap opens the archive.
23. Pickle jar replaces the ballot box.
24. Election Booth is a separate finale scene.
25. Baba and Tony are mandatory supporters.
26. Completing the mandatory path guarantees victory.
27. Status meters affect presentation, not permanent success.
28. Mitko defeats the incumbent and becomes Mayor.
29. Chapter 1 ends after the mayoral victory.
30. No Chapter 2 or Parliament story is introduced.
31. Existing stable IDs must not be renamed.

## 23. Remaining flexible areas

These may be polished without changing structure:

- exact Bulgarian and English wording;
- individual jokes;
- Penka’s optional dialogue;
- Old Men bark variations;
- apartment flavor interactions;
- Mehana observations;
- Journalist’s exact questions;
- Municipality visual staging;
- Mayor’s precise excuses;
- archive labels;
- exact vote count;
- crowd reactions;
- meter presentation;
- sound effects;
- animation choreography;
- optional prop jokes.

Changes to mandatory quest dependencies, canonical solutions, scene progression, Mayor objective, or stable IDs require explicit review.
