# BAIM / Comrade Candidate — File Cheat Sheet

## Purpose

This file is a quick-reference guide for the most important project files.

Use it when you remember a filename but forget:

- what it does,
- whether it is engine or content,
- whether it is safe to edit,
- what other files it usually works with.

For deeper explanations, see:

- `00_Project_Overview.md`
- `01_Project_Structure.md`
- `02_Engine_Overview.md`

---

# Fastest Mental Map

```text
Game.js
    =
main coordinator

Renderer.js
    =
draws the game

MovementSystem.js
    =
moves characters

AnimationPlayer.js
    =
plays animations

AssetLoader.js
    =
loads runtime assets

DialogueSystem.js
    =
runs conversations

InventorySystem.js
    =
tracks items

QuestSystem.js
    =
tracks quest progress

Localization.js
    =
provides Bulgarian / English text

SaveSystem.js
    =
saves and restores progress

geometry.js
    =
generic geometry math

SceneGeometry.js
    =
scene geometry logic

SceneEditor.js
    =
developer scene-editing tools

CharacterRenderMath.js
    =
character drawing calculations

ids.js
    =
stable identifiers
```

---

# Core Engine Files

## `src/engine/Game.js`

### Main job

Coordinates the major game systems.

Think:

> Traffic controller.

### Usually involved with

- player input,
- current scene,
- movement,
- interactions,
- dialogue,
- inventory,
- quests,
- rendering,
- save/load.

### Does NOT mean

`Game.js` should contain every feature itself.

### Remember

```text
Game.js coordinates.
Specialized systems perform the work.
```

---

## `src/engine/Renderer.js`

### Main job

Draws the current game state.

Think:

> State → pixels.

### Usually involved with

- scene backgrounds,
- layers,
- characters,
- sprites,
- objects,
- overlays,
- debug visuals.

### Common debugging question

```text
Does the correct state exist,
but Renderer is not showing it?
```

---

## `src/engine/MovementSystem.js`

### Main job

Handles character movement.

Think:

> Move character from A to B.

### Usually involved with

- movement target,
- direction,
- position updates,
- stopping,
- walkable areas,
- movement animation state.

### Should stay reusable

It should not care that a location is specifically a Chapter 1 village square.

---

## `src/engine/AnimationPlayer.js`

### Main job

Controls animation playback.

Think:

> Which animation frame should be visible now?

### Usually involved with

- animation selection,
- frame timing,
- looping,
- idle/walk transitions,
- current frame.

### Typical flow

```text
Movement state
    ↓
AnimationPlayer
    ↓
current frame
    ↓
Renderer
```

---

## `src/engine/AssetLoader.js`

### Main job

Loads runtime assets.

Think:

> Get files from disk/server into usable browser resources.

### Usually involved with

- images,
- backgrounds,
- sprites,
- animation files,
- runtime asset paths.

### Common debugging question

```text
Does the source asset exist,
but the runtime asset failed to load?
```

---

## `src/engine/CharacterRenderMath.js`

### Main job

Performs calculations needed to draw characters correctly.

Think:

> Where and how large should the sprite be?

### Usually involved with

- scale,
- offsets,
- anchor points,
- feet position,
- alignment,
- render dimensions.

### Relationship

```text
CharacterRenderMath
    ↓
calculates

Renderer
    ↓
draws
```

---

## `src/engine/DialogueSystem.js`

### Main job

Runs conversations.

Think:

> Dialogue flow controller.

### Usually involved with

- starting dialogue,
- dialogue nodes,
- choices,
- next nodes,
- dialogue effects,
- ending dialogue.

### May cooperate with

- `QuestSystem.js`
- `InventorySystem.js`
- localization
- save state.

---

## `src/engine/InventorySystem.js`

### Main job

Tracks player items.

Think:

> What does the player currently own?

### Usually involved with

- adding items,
- removing items,
- checking ownership,
- inventory contents.

### Example

```text
TAKE item
    ↓
InventorySystem
    ↓
item becomes owned
```

---

## `src/engine/QuestSystem.js`

### Main job

Tracks quest progress.

Think:

> What stage is this quest currently in?

### Usually involved with

- starting quests,
- objectives,
- progression,
- completion state.

### Common partners

- dialogue,
- inventory,
- save system.

---

## `src/engine/Localization.js`

### Main job

Provides localized visible text.

Think:

> Localization key → current-language text.

### Current languages

- Bulgarian
- English

### Important rule

Avoid scattering hardcoded visible text through engine code when localization should handle it.

---

## `src/engine/SaveSystem.js`

### Main job

Saves and restores game progress.

Think:

> Current state ↔ stored state.

### May need to preserve

- current scene,
- position,
- inventory,
- quests,
- scene states,
- flags,
- important interaction state.

### High-risk area

Changes here can affect old save compatibility.

---

## `src/engine/geometry.js`

### Main job

Generic geometry calculations.

Think:

> Math helpers.

### Examples

- point inside polygon,
- distance,
- coordinate calculations,
- nearest valid point.

### Important boundary

Should normally be generic, not tied to one Chapter 1 scene.

---

## `src/engine/SceneGeometry.js`

### Main job

Applies geometry concepts to game scenes.

Think:

> Geometry with scene meaning.

### Usually involved with

- walkable zones,
- hotspots,
- exits,
- anchors,
- scene boundaries.

### Difference from `geometry.js`

```text
geometry.js
    =
generic math

SceneGeometry.js
    =
scene-aware geometry
```

---

## `src/engine/SceneEditor.js`

### Main job

Supports development-time scene editing.

Think:

> Tool for developers, not normal gameplay.

### May work with

- walkable areas,
- hotspots,
- exits,
- anchors,
- geometry,
- placement.

---

## `src/engine/ids.js`

### Main job

Defines or centralizes stable IDs.

Think:

> Permanent names that connect systems.

### IDs may represent

- scenes,
- NPCs,
- items,
- quests,
- hotspots,
- exits,
- anchors.

### Important warning

Do not rename stable IDs casually.

They may be referenced by:

```text
content
dialogue
quests
inventory
save files
tests
scene transitions
```

---

# Important Non-Engine Files

## `src/main.js`

### Main job

Starts the application.

Think:

```text
index.html
    ↓
src/main.js
    ↓
game initialization
```

Usually should stay relatively small.

---

## `src/styles.css`

### Main job

Styles HTML-based UI.

Think:

> HUD, menus, buttons, editor UI, layout.

Not the same thing as painted runtime artwork.

---

## `src/content/chapter1/`

### Main job

Contains Chapter 1-specific game content.

Think:

> The story and world data for Chapter 1.

Examples may include:

- scenes,
- dialogue,
- NPCs,
- quests,
- interactions,
- content configuration.

### Important boundary

```text
src/engine/
    =
HOW

src/content/chapter1/
    =
WHAT
```

---

# Asset Areas

## `assets/`

### Main job

Runtime-ready files.

Think:

> Files the game actually loads.

Examples:

- backgrounds,
- sprites,
- animation frames,
- interface artwork.

---

## `assets_src/`

### Main job

Production/source material.

Think:

> Files used to create runtime assets.

These may need processing before the game can use them.

---

## `target/`

### Main job

Generated development output.

Think:

> Temporary or generated results.

May include:

- previews,
- processed assets,
- staging,
- inspection output.

Do not assume these files should be manually edited.

---

# Development and Documentation

## `tools/`

### Main job

Development utilities.

Think:

> Scripts developers run.

Examples may include tools for:

- asset unpacking,
- metadata inspection,
- preview generation,
- runtime staging.

---

## `test/`

### Main job

Automated verification.

Think:

> Did a change break expected behavior?

Run tests after important engine changes.

---

## `docs/`

### Main job

Technical, creative, and workflow documentation.

Think:

> Why and how the project is built.

---

## `docs/Developer-Handbook/`

### Main job

Beginner-friendly project reference and learning system.

Current important files:

```text
00_Project_Overview.md
01_Project_Structure.md
02_Engine_Overview.md
03_File_Cheat_Sheet.md
13_Daily_Learning_Log.md
Glossary.md
PERSONAL_RULES.md
```

---

## `docs/Prompts/`

### Main job

Reusable AI task workflows.

Files currently include:

```text
01_New_Feature.md
02_Bug_Fix.md
03_Code_Review.md
04_Refactor.md
05_Explain_File.md
06_Documentation.md
```

---

# Root Files

## `AGENTS.md`

### Main job

Defines project-level rules for AI-assisted development.

Includes rules about:

- architecture,
- art,
- scope,
- stable IDs,
- localization,
- testing,
- approvals.

Think:

> Project rules.

---

## `00_START_SESSION.md`

### Main job

Defines what Codex should do at the start of a development session.

Think:

> Session startup checklist.

---

## `package.json`

### Main job

Defines the Node.js project.

Think:

> Dependencies + npm scripts.

Example:

```text
npm run dev
```

looks for the `dev` script in `package.json`.

---

## `package-lock.json`

### Main job

Records exact installed dependency versions.

Think:

```text
package.json
    =
what dependencies are wanted

package-lock.json
    =
exact dependency versions
```

Usually managed automatically by npm.

---

## `index.html`

### Main job

Browser entry page.

Simplified flow:

```text
Browser
    ↓
index.html
    ↓
src/main.js
    ↓
game
```

---

# If Something Breaks, Start Here

## Character does not appear

Check:

```text
content/data
    ↓
AssetLoader
    ↓
animation data
    ↓
AnimationPlayer
    ↓
CharacterRenderMath
    ↓
Renderer
```

---

## Character does not move

Check:

```text
input
    ↓
Game.js
    ↓
walkable geometry
    ↓
MovementSystem
    ↓
Renderer
```

---

## Dialogue does not start

Check:

```text
hotspot
    ↓
selected TALK action
    ↓
interaction data
    ↓
DialogueSystem
    ↓
Localization
    ↓
dialogue UI
```

---

## Item is not added

Check:

```text
TAKE interaction
    ↓
content response
    ↓
InventorySystem
    ↓
inventory state
    ↓
UI / save state
```

---

## Quest does not progress

Check:

```text
trigger
    ↓
content effect
    ↓
QuestSystem
    ↓
quest state
    ↓
dialogue / UI / save consequences
```

---

## Save loads incorrectly

Check:

```text
saved state
    ↓
stable IDs
    ↓
SaveSystem
    ↓
restored system state
    ↓
Renderer
```

---

## Asset is missing

Check:

```text
source asset exists?
    ↓
generation / staging completed?
    ↓
runtime file exists?
    ↓
path correct?
    ↓
AssetLoader successful?
```

Do not immediately assume the original asset is missing.

---

# Where Should I Make This Change?

| Change | First Place to Look |
| --- | --- |
| Character movement behavior | `MovementSystem.js` |
| Drawing problem | `Renderer.js` |
| Animation playback | `AnimationPlayer.js` |
| Runtime asset loading | `AssetLoader.js` |
| Character size/position math | `CharacterRenderMath.js` |
| Dialogue flow | `DialogueSystem.js` |
| Inventory logic | `InventorySystem.js` |
| Quest state | `QuestSystem.js` |
| Translation/localized text | `Localization.js` or localization content |
| Save/load behavior | `SaveSystem.js` |
| Generic geometry | `geometry.js` |
| Scene geometry | `SceneGeometry.js` |
| Scene editor behavior | `SceneEditor.js` |
| Stable identifiers | `ids.js` |
| Chapter 1 story/content | `src/content/chapter1/` |
| Runtime artwork | `assets/` |
| Production artwork/source | `assets_src/` |
| Build/processing utility | `tools/` |
| Tests | `test/` |
| Project explanation | `docs/` |

---

# Before Editing an Engine File

Ask these questions:

```text
1. What problem am I solving?

2. Which system actually owns this responsibility?

3. Is this engine behavior or Chapter-specific content?

4. Could this change affect other scenes?

5. Could this affect saved games?

6. Could this affect stable IDs?

7. Are tests required?

8. Am I editing a generated file instead of its source?
```

This short checklist can prevent many unnecessary changes.

---

# 10-Second Version

If you remember nothing else:

```text
Game.js
    =
coordinates

Renderer.js
    =
draws

MovementSystem.js
    =
moves

AnimationPlayer.js
    =
animates

AssetLoader.js
    =
loads

DialogueSystem.js
    =
talks

InventorySystem.js
    =
items

QuestSystem.js
    =
quests

Localization.js
    =
languages

SaveSystem.js
    =
saves

geometry.js
    =
math

SceneGeometry.js
    =
scene shapes

SceneEditor.js
    =
editor

CharacterRenderMath.js
    =
character draw math

ids.js
    =
stable names
```

---

# Remember

When you do not know where to look, first decide which category the problem belongs to:

```text
INPUT
MOVEMENT
RENDERING
ANIMATION
ASSETS
DIALOGUE
INVENTORY
QUESTS
LOCALIZATION
SAVE STATE
GEOMETRY
CONTENT
TOOLS
DOCUMENTATION
```

Then look for the file whose responsibility matches that category.

The most important rule is:

> Do not choose a file because its name looks familiar. Choose it because it owns the responsibility you are changing.