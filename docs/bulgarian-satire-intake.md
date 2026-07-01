# Bulgarian Satire Intake

## Purpose

The game should feel connected to living Bulgarian absurdity, not generic Balkan comedy. Recent news, public jokes, bureaucracy stories, scandals, village gossip, and political madness should influence the humor, but only after being transformed into fictional satire.

Recent Bulgarian reality is inspiration fuel, not direct game content.

The goal is to extract:

- social mechanisms
- language rhythm
- bureaucratic logic
- public cynicism
- empty promise patterns
- visual absurdity
- village gossip dynamics

Then convert them into reusable, fictional, bilingual adventure-game material.

## When To Run This Pass

Run before:

- final dialogue writing
- poster/sign writing
- radio/TV/news snippets
- Old Men Chorus lines
- Journalist interview questions
- Municipality jokes
- item descriptions
- final scene flavor polish

Do not run during:

- renderer work
- save-system work
- inventory engine work
- movement/pathfinding work
- unrelated bug fixing

## Transformation Rule

Use this pipeline:

```text
Real inspiration -> absurd mechanism -> fictional game version -> scene/NPC placement -> BG line -> EN adaptation -> risk check
```

Example:

Real inspiration:
Repeated public works and repairs of repairs.

Absurd mechanism:
The repair becomes more permanent than the thing being repaired.

Fictional game version:
A village poster says:

```text
РЕМОНТ НА РЕМОНТА — ФАЗА 3
```

English Look text:

```text
Repair of the repair, phase 3. Nobody remembers phase 1, which is legally convenient.
```

## Freshness Levels

### Evergreen

Safe for core dialogue and puzzle flavor.

Examples:

- fake forms
- stamps
- public cynicism
- empty promises
- impossible bureaucracy
- fake transparency
- repairs of repairs
- coalition excuses without specific parties

### Seasonal

Good for posters, TV, radio, optional barks.
Easy to replace later.

Examples:

- temporary public panic
- current utility complaint patterns
- local budget rumors
- public transport absurdity
- rotating slogan jokes

### Hot Headline

Use only as private inspiration.
Do not put directly in the game unless heavily fictionalized.

Examples:

- current scandal mechanics
- current public outrage structure
- current institutional excuse style

Extract the mechanism, then discard the identifying details.

### Rejected

Reject seeds that are:

- too direct
- too hateful
- too stale
- too real-person-specific
- only funny because they are shocking
- legally risky
- impossible to understand after the news cycle passes

## Best Chapter 1 Injection Points

Use recent Bulgarian absurdity mainly in:

- Bai Mitko's apartment TV
- Village Square posters
- Old Men Chorus comments
- Journalist questions
- Municipality forms
- Clerk excuses
- Mayor excuses
- Mehana gossip
- item descriptions
- failed interaction lines
- optional Look text

Do not change the main Chapter 1 puzzle structure.

## What Must Stay Stable

The satire intake pass may not change:

- scene IDs
- NPC IDs
- item IDs
- quest IDs
- save-state fields
- win/lose conditions
- main puzzle dependencies
- core character roles

## Practical Intake Output Format

Use this format for new seeds:

```text
Seed:
Freshness:
Risk:
Real-world mechanism:
Fictional transformation:
Placement:
BG draft:
EN adaptation:
Notes:
```

Keep the real-world mechanism generic. Do not paste article text, real names, copied jokes, or specific accusations.

## Risk Check

Before approving a seed:

- Is every person, party, agency scandal, and public figure fictionalized?
- Would the joke still work six months later?
- Does it target a system, habit, or public ritual instead of a vulnerable person?
- Can the Bulgarian be written naturally first if the joke is culturally Bulgarian?
- Does the English preserve the comic job instead of translating word by word?
- Can the seed be removed or replaced without breaking a puzzle?

If any answer fails, downgrade the seed to private inspiration or reject it.
