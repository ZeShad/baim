# BAIM / Comrade Candidate — Project Overview

## Purpose

This document gives a high-level overview of the BAIM project.

It is intended to answer the questions:

- What is this project?
- What kind of game are we building?
- What is the current scope?
- What systems already exist?
- How is the project organized?
- What is finished, and what is still in development?

For detailed information about individual systems and files, see the other chapters in the Developer Handbook.

---

## What Is BAIM?

BAIM is the development project for:

**Другарят Кандидат / Comrade Candidate**

It is a high-resolution 2D point-and-click adventure game with Bulgarian political satire, character-driven humor, exploration, dialogue, interaction, and puzzle-like gameplay.

The game is inspired by the spirit of classic adventure games, but the production target is not a low-resolution pixel game.

The intended visual presentation is modern, high-resolution, painted 2D artwork with animated characters.

---

## Current Development Scope

The current development goal is focused on **Chapter 1**.

Chapter 1 acts as the first playable vertical slice of the game.

A vertical slice is a small but representative section of the final game that demonstrates how the major systems work together.

The important principle is:

> Build Chapter 1 in a way that allows Chapter 2 and later chapters to reuse the same systems.

This means the project should avoid hardcoding Chapter 1-specific behavior into the game engine whenever possible.

---

## Core Design Principles

The project follows several important principles.

### High-Resolution 2D Presentation

The game is intended to use:

- painted backgrounds,
- illustrated characters,
- real character animation,
- layered scene composition,
- interactive environments.

Placeholder rectangles, labels, ellipses, and similar simple shapes are development and debugging tools only.

They are not the intended final visual style.

### Data-Driven Design

Game content should be separated from reusable engine systems whenever practical.

This allows content such as:

- scenes,
- dialogue,
- characters,
- interactions,
- quests,
- localization,
- art references,

to change without requiring major changes to the engine.

### Chapter-Extensible Architecture

The engine should support future chapters without requiring large rewrites.

Reusable systems should remain independent of specific Chapter 1 content where possible.

### Stable IDs

Important identifiers should remain stable.

Renaming IDs can affect:

- saved games,
- scene references,
- dialogue,
- quests,
- interactions,
- art mappings,
- other content relationships.

Stable IDs should therefore not be renamed casually.

---

## Game Style and Tone

Comrade Candidate is a satirical adventure game.

The humor is intended to be:

- absurdist,
- deadpan,
- character-driven,
- visually playful,
- bureaucratically surreal.

The premise may contain darker political themes, but the delivery should remain playful and comedic.

The visual and narrative tone is inspired by the spirit of 1990s cartoon adventure games while remaining rooted in Bulgarian provincial political satire.

Characters are fictional.

The project avoids direct accusations involving real people and avoids using real political party branding as fictional game content.

---

## Languages

The game supports:

- Bulgarian
- English

Localization is treated as a proper game system rather than a last-minute translation layer.

Bulgarian and English text should both sound natural.

The goal is not literal machine translation but writing that works naturally in each language.

---

## Core Gameplay

The project uses a point-and-click adventure structure.

The player can interact with the world using actions such as:

- Look
- Talk
- Use
- Take

The game also includes systems for:

- character movement,
- walkable areas,
- dialogue,
- inventory,
- quests,
- localization,
- saving and loading,
- scene rendering,
- scene editing,
- character animation.

The exact behavior of each system is explained later in the Developer Handbook.

---

## Main Character

The current playable character is Bai Mitko.

Bai Mitko is rendered as an animated character inside the game scenes.

The project currently contains an external animation pipeline used to prepare and load his runtime animations.

During development, missing runtime animation assets caused Bai Mitko to disappear from the playable scene.

The animation staging process was repaired, and the runtime assets were successfully regenerated.

After regeneration, Bai Mitko appeared correctly in the game again.

---

## Current Scenes

Two important scenes currently used during development are:

### Bai Mitko's Apartment

An interior scene used for testing:

- scene rendering,
- character placement,
- walkable areas,
- layered artwork,
- scene editing.

### Village Square

An outdoor scene featuring the municipal square and Bai Mitko.

This scene is currently one of the clearest examples of the intended visual direction of the game.

It is used to test:

- character rendering,
- dialogue,
- interactions,
- walkable areas,
- runtime artwork,
- scene composition.

---

## High-Level Architecture

At a very high level, the project can be thought of as several layers:

```text
Player Input
    ↓
Game Coordination
    ↓
Reusable Engine Systems
    ↓
Chapter Content and Game Data
    ↓
Rendering / Animation / Audio / UI
    ↓
What the player sees and experiences
```

The engine provides reusable behavior.

The content files define what happens in the game.

The assets provide the visual material.

---

## Major Project Areas

The repository contains several important top-level areas.

### `src/`

Contains the main runtime source code.

Important reusable engine systems live under:

`src/engine/`

Chapter-specific content lives under areas such as:

`src/content/chapter1/`

### `assets/`

Contains runtime assets used by the game.

These are the files the game actually loads while running.

### `assets_src/`

Contains source or production assets.

These may be processed before becoming runtime-ready assets.

### `docs/`

Contains project documentation, design decisions, workflows, and the Developer Handbook.

### `test/`

Contains automated tests.

### `tools/`

Contains development and asset-processing tools.

### `target/`

Contains generated development outputs.

Some files in this area may be created automatically by tools rather than edited manually.

---

## Important Engine Systems

The project currently contains specialized engine files including:

- `Game.js`
- `Renderer.js`
- `MovementSystem.js`
- `AnimationPlayer.js`
- `AssetLoader.js`
- `DialogueSystem.js`
- `InventorySystem.js`
- `QuestSystem.js`
- `Localization.js`
- `SaveSystem.js`
- `SceneEditor.js`
- `SceneGeometry.js`
- `CharacterRenderMath.js`
- `geometry.js`
- `ids.js`

A useful mental model is:

> `Game.js` coordinates the game, while the other engine files perform specialized jobs.

More detailed explanations are provided in:

`02_Engine_Overview.md`

and:

`03_File_Cheat_Sheet.md`

---

## Development Tools

The current development environment includes:

- Visual Studio Code
- Git
- GitHub
- Node.js
- npm
- Codex CLI

The game can be launched locally with the development server.

The normal development address is:

`http://localhost:5173`

The project also contains internal development tools for:

- scene editing,
- walkable-area editing,
- animation testing,
- runtime art testing.

---

## Testing

Automated testing is part of the project workflow.

During the animation repair work, the test suite reported:

```text
95 passed
0 failed
```

Tests are used to help detect regressions when changing engine systems, content, or asset pipelines.

Passing tests do not replace manual gameplay testing, especially for visual behavior, movement, scene composition, and animation.

---

## Git Workflow

Development work should normally not be performed directly on `master`.

The preferred workflow is:

```text
master
    ↓
create feature/documentation branch
    ↓
make changes
    ↓
review changes
    ↓
commit
    ↓
push branch
    ↓
create Pull Request
    ↓
review Pull Request
    ↓
merge into master
    ↓
synchronize local master
```

This workflow keeps experimental or unfinished work separated from the stable main branch.

---

## AI-Assisted Development Workflow

The project includes several files that define how Codex or another AI assistant should work with the repository.

### `AGENTS.md`

Defines the project's technical and creative rules.

### `docs/Developer-Handbook/PERSONAL_RULES.md`

Defines how the AI should collaborate with and teach the project owner.

### `00_START_SESSION.md`

Defines what should happen at the beginning of a Codex session.

### `docs/Developer-Handbook/13_Daily_Learning_Log.md`

Records progress and learning between development sessions.

### `docs/Prompts/`

Contains reusable task-specific workflows for:

- new features,
- bug fixes,
- code reviews,
- refactoring,
- file explanations,
- documentation.

Together, these files provide continuity between AI-assisted development sessions.

---

## Current Project State

At the time this document was created:

- the BAIM project launches locally;
- the main development environment is working;
- Bai Mitko's runtime animation assets have been regenerated successfully;
- Bai Mitko can appear in the playable village-square scene;
- the apartment and village-square development scenes are available;
- the Developer Handbook foundation exists;
- the Codex collaboration workflow is documented;
- the first documentation Pull Request has been reviewed and merged into `master`;
- development of the full Chapter 1 vertical slice is still ongoing.

The project should therefore be considered an active prototype rather than a finished game.

---

## What Is Still In Development

Important remaining work includes:

- completing Chapter 1 content;
- expanding playable interactions;
- expanding dialogue and quests;
- completing production-quality artwork;
- continuing character animation integration;
- validating scene movement and walkable areas;
- expanding and maintaining automated tests;
- completing Developer Handbook chapters;
- documenting more engine systems;
- continuing gameplay development.

The exact priorities may change as the project evolves.

---

## Where to Learn More

For more detail, continue with:

`01_Project_Structure.md`

to understand where project files live.

Then read:

`02_Engine_Overview.md`

to understand how the major engine systems work together.

For quick reference, use:

`03_File_Cheat_Sheet.md`

---

## Remember

BAIM / Comrade Candidate is a high-resolution 2D point-and-click adventure game built around reusable engine systems and data-driven content.

The most important architectural idea is:

> Build the engine for the whole game, not only for Chapter 1.

And the easiest way to remember the project structure is:

```text
Engine = how the game works

Content = what happens in the game

Assets = what the player sees and hears

Documentation = why the project is built this way
```