# Comrade Candidate Agent Instructions

## Project Goal

Build a high-resolution 2D point-and-click adventure prototype:

**Другарят Кандидат / Comrade Candidate**

Chapter 1 only for now. The first version must establish reusable systems and one playable vertical
slice that future chapters can extend.

## Non-Negotiable Direction

- This is not a low-res pixel game.
- Placeholder rectangles, ellipses, and labels are debug visuals only.
- Production target is modern high-resolution painted 2D adventure art with real animation.
- Keep the game data-driven and chapter-extensible.
- Do not hardcode Chapter 1 in ways that prevent Chapter 2.
- Do not rename stable IDs unless the user explicitly approves a migration.
- Do not regenerate or replace approved content unless explicitly requested.

## Tone And Content

- Follow `docs/humor-bible.md`.
- Humor is absurdist, deadpan, character-driven, visually playful, and bureaucratically surreal.
- The tone is dark in premise but light and playful in delivery.
- 90s cartoon adventure spirit, rooted in Bulgarian provincial political satire.
- Fictional characters only.
- No direct real politician names, real party logos, or real-person accusations.
- Bulgarian and English must both be authored naturally, not literal machine translations.

## Architecture Rules

- Engine systems live under `src/engine/`.
- Chapter content lives under `src/content/chapter1/`.
- Localization lives under `src/content/localization/`.
- Art contracts live under `src/content/art/`.
- Runtime assets live under `assets/`.
- Source/concept art and prompts live under `assets_src/`.
- Documentation and production decisions live under `docs/`.

Core systems must stay reusable:

- scene management
- point-and-click movement
- walk polygons and depth zones
- interactions and verbs
- dialogue trees
- inventory
- quests
- localization
- save state
- animation definitions
- asset manifests

## Stable IDs

Use stable IDs for all gameplay content:

- scenes: `scene.chapter1.apartment`
- NPCs: `npc.bai_mitko`
- items: `item.fake_diploma`
- quests: `quest.chapter1.main`
- hotspots: `hotspot.apartment.accordion`
- exits: `exit.apartment.to_square`
- walk zones: `walk.chapter1.apartment.main`
- anchors: `anchor.<scene>.<name>`

Once introduced, IDs are save-game and content contracts.

## Graphics Pipeline

Follow `docs/production-graphics-plan.md`, `docs/art-pipeline.md`, and `docs/visual-style-bible.md`.

The visual target is fresh, elastic, highly readable, 2D hand-painted cartoon adventure art.
Avoid grim realism, muddy over-rendering, anime, cyberpunk, flat corporate vector art, and generic mobile casual style.

Recommended approach:

1. Generate/approve style key art.
2. Generate/approve Bai Mitko model sheet.
3. Generate/approve main scene concepts.
4. Produce layered backgrounds.
5. Define scene geometry.
6. Produce character animation via reviewed sprite atlas/sheet exports.
7. Import into the runtime asset manifest.

Do not mass-produce final art before the style frame, Bai Mitko, and first scene direction are approved.

## Animation Direction

Follow `docs/animation-direction.md`.

Current Bai Mitko animation path:

- Use Ludo.ai external sprite sheet ZIPs plus JSON frame metadata under `assets_src/characters/bai_mitko/external_animation_v1/`.
- Keep previous failed rig/layer experiments out of the active dev surfaces.
- Sprite atlases/sheets are the reliable browser runtime path unless the user explicitly changes direction.

The current renderer may use debug fallback drawings, but content definitions must remain compatible
with real atlas/skeletal assets.

## Localization Rules

Every player-facing string must have Bulgarian and English entries.

Bulgarian should sound native, local, and funny.
English should preserve the joke, not mechanically translate it.

Do not place new visible text directly in code unless it is a temporary developer/debug label.

## Testing

Run:

```bash
npm test
```

Add tests when changing:

- localization behavior
- save schema/defaults
- geometry
- quest state
- inventory state
- dialogue effects

## Decision Points

Pause for user decision before:

- switching from custom canvas renderer to PixiJS;
- replacing the current Ludo.ai sprite-sheet import path;
- replacing the visual style;
- changing the resolution/aspect ratio;
- renaming stable IDs;
- expanding beyond Chapter 1;
- generating a large final art batch.

Make small implementation decisions directly when they preserve this plan.

## Bulgarian Satire Intake Rule

Before writing or polishing major game content, especially:

- NPC dialogue
- NPC barks
- posters
- radio/TV lines
- newspaper headlines
- item descriptions
- scene prop jokes
- Old Men Chorus comments
- Journalist questions
- Municipality bureaucracy jokes
- quest flavor text
- optional dialogue branches

the agent should perform a "Bulgarian satire intake pass."

The purpose is to make the game feel alive, current, Bulgarian, and absurd, without becoming direct real-world political commentary.

The satire intake pass should:

- review recent Bulgarian news where available
- review Bulgarian humor, jokes, public stories, and absurd local situations where available
- extract themes, mechanisms, language rhythm, and social absurdity
- transform them into fictionalized 1990s adventure-game satire
- sort joke seeds by scene, NPC, item, poster, radio/TV line, or optional dialogue branch
- keep everything fictional, reusable, bilingual, and legally safe

Important rule:
Recent Bulgarian reality is inspiration fuel, not direct game content.

Do NOT:

- use real politician names directly
- depict real public figures as NPCs
- copy headlines, jokes, posts, articles, or comments verbatim
- make direct accusations about real people
- base core puzzle logic on a current headline that will be stale in six months
- use hateful caricature or shock-only humor

DO:

- fictionalize everything
- target systems, bureaucracy, corruption habits, public cynicism, empty promises, fake transparency, broken public works, coalition chaos, and village gossip logic
- keep the tone fresh, absurd, visual, deadpan, and playful
- prefer Day-of-the-Tentacle-like cartoon absurdity over heavy grim realism
- use recent inspiration first as optional flavor, not as hard dependency in the main puzzle path

If live browsing or recent-source access is unavailable:

- do NOT invent fake recent news
- add TODO notes for a future satire intake pass
- continue with evergreen fictional Bulgarian bureaucratic satire
