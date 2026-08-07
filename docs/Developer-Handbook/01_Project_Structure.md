# BAIM / Comrade Candidate — Project Structure

## Purpose

This chapter explains how the BAIM repository is organized and where different kinds of files belong.

The goal is to make it easy to answer questions such as:

- Where does engine code live?
- Where does Chapter 1 content live?
- Where are runtime assets?
- Where are source assets?
- Which files are generated?
- Where should documentation go?
- Which folders should normally not be edited manually?

This chapter explains the structure of the repository, not the detailed behavior of the engine.

For engine behavior, continue with:

`02_Engine_Overview.md`

---

## The Big Picture

The repository is organized by responsibility.

A useful mental model is:

```text
BAIM Repository
│
├── src/         → runtime source code
├── assets/      → runtime-ready assets
├── assets_src/  → source / production assets
├── docs/        → documentation and design decisions
├── test/        → automated tests
├── tools/       → development and build tools
├── target/      → generated development outputs
│
├── AGENTS.md
├── 00_START_SESSION.md
├── package.json
├── package-lock.json
└── index.html
```

The most important separation is:

```text
src/        = code and game data used by the application

assets/     = files the game loads at runtime

assets_src/ = source material used to create runtime assets

docs/       = knowledge about how and why the project works
```

---

# 1. `src/` — Runtime Source Code

`src/` contains the JavaScript and supporting source files that make the game work.

This is one of the most important directories in the project.

At a high level, `src/` contains:

```text
src/
├── engine/
├── content/
├── main.js
└── styles.css
```

The exact structure may grow over time, but the architectural idea is important:

> Reusable systems belong in the engine. Game-specific content belongs in content.

---

## `src/main.js`

`main.js` is near the beginning of the runtime startup path.

Its job is to start or initialize the application and connect the browser page to the game code.

A useful mental model is:

```text
Browser loads page
      ↓
index.html
      ↓
src/main.js
      ↓
Game initialization
      ↓
Game systems begin running
```

It should remain relatively small compared with major engine files.

---

## `src/styles.css`

`styles.css` contains visual styling for the HTML-based parts of the application.

This can include things such as:

- layout,
- buttons,
- development UI,
- HUD elements,
- menus,
- text styling,
- editor interfaces.

It is different from painted game artwork.

Think of it as:

```text
styles.css
    =
how HTML interface elements look
```

while:

```text
assets/
    =
the actual visual assets used inside the game world
```

---

# 2. `src/engine/` — Reusable Game Systems

The `src/engine/` directory contains systems that should be reusable across chapters.

Current important files include:

- `AnimationPlayer.js`
- `AssetLoader.js`
- `CharacterRenderMath.js`
- `DialogueSystem.js`
- `Game.js`
- `geometry.js`
- `ids.js`
- `InventorySystem.js`
- `Localization.js`
- `MovementSystem.js`
- `QuestSystem.js`
- `Renderer.js`
- `SaveSystem.js`
- `SceneEditor.js`
- `SceneGeometry.js`

These files are not intended to describe the story of Chapter 1.

They provide reusable capabilities that Chapter 1 and future chapters can use.

---

## Why the Engine Is Separate

Imagine Chapter 1 contains Bai Mitko's apartment and village square.

Later chapters may contain completely different locations.

We do not want to create:

```text
MovementSystemForChapter1.js
MovementSystemForChapter2.js
MovementSystemForChapter3.js
```

Instead, we want one reusable:

```text
MovementSystem.js
```

that understands movement generally.

The same principle applies to:

- dialogue,
- inventory,
- saving,
- quests,
- animation,
- rendering,
- localization.

This is what makes the architecture chapter-extensible.

---

## `Game.js` as Coordinator

`Game.js` is one of the central engine files.

A useful simplified model is:

```text
                 Game.js
                    │
     ┌──────────────┼──────────────┐
     ↓              ↓              ↓
 Movement       Dialogue        Inventory
 System         System          System
     │              │              │
     └──────────────┼──────────────┘
                    ↓
                 Renderer
```

This diagram is intentionally simplified.

`Game.js` coordinates systems rather than replacing them.

The specialized files still perform their own jobs.

---

# 3. `src/content/` — Game Content

`src/content/` contains data and definitions that describe the actual game content.

This is conceptually different from `src/engine/`.

The engine answers:

> How can the game do something?

Content answers:

> What actually happens in this game?

Examples of content include:

- scenes,
- characters,
- dialogue,
- quests,
- interactions,
- localized text,
- art mappings,
- chapter-specific configuration.

---

## `src/content/chapter1/`

Chapter 1 content belongs under:

```text
src/content/chapter1/
```

This keeps Chapter 1-specific information separate from reusable engine systems.

The goal is that a future Chapter 2 can have something conceptually similar to:

```text
src/content/chapter2/
```

without requiring the engine to be rewritten.

---

## Example

Suppose the player clicks a broken fountain in the village square.

The reusable system may know:

```text
A player can LOOK at an interactive object.
```

But Chapter 1 content defines:

```text
Object:
broken fountain

Action:
LOOK

Response:
Bai Mitko says something specific about the fountain.
```

So:

```text
engine
    =
understands what LOOK means

content
    =
defines what happens when LOOK is used on this particular object
```

This separation is one of the most important ideas in the whole project.

---

# 4. `assets/` — Runtime Assets

`assets/` contains files that are intended to be loaded by the running game.

Examples may include:

- painted backgrounds,
- character sprites,
- animation frames,
- interface artwork,
- other runtime images.

The current repository includes Chapter 1 runtime assets under areas such as:

```text
assets/chapter1/
```

These files should be thought of as:

> Ready for the game to use.

---

## Runtime Assets vs Source Assets

Do not confuse:

```text
assets/
```

with:

```text
assets_src/
```

The distinction is important.

A simple example:

```text
Original production material
        ↓
assets_src/
        ↓
processing / conversion
        ↓
assets/
        ↓
game loads the result
```

This is similar to video production:

```text
source footage
    ↓
editing / rendering
    ↓
final delivery file
```

`assets_src/` is closer to source footage.

`assets/` is closer to the final delivery file.

---

# 5. `assets_src/` — Source and Production Assets

`assets_src/` contains source material used during art and asset production.

This may include:

- source images,
- prompts,
- production material,
- animation source packages,
- files that require processing before runtime use.

The exact contents can evolve as the art pipeline grows.

The key rule is:

> Do not assume files in `assets_src/` are directly loaded by the game.

Some may need to pass through tools or build steps before reaching `assets/`.

---

# 6. Generated Assets and Animation Staging

The Bai Mitko animation issue demonstrated an important part of the repository structure.

The original animation material existed, but the runtime assets were missing.

The project includes tooling that can:

```text
external animation source
        ↓
inspect / unpack
        ↓
process
        ↓
stage runtime assets
        ↓
game loads runtime PNG files
```

This means a missing runtime asset does not automatically mean the original source asset is missing.

When debugging assets, always ask:

```text
Is the source missing?

or

Did the generation / staging step fail?
```

That distinction previously mattered when Bai Mitko disappeared from the playable scene.

---

# 7. `docs/` — Documentation

The `docs/` directory contains documentation about:

- architecture,
- production workflows,
- art direction,
- animation,
- satire and narrative direction,
- development decisions,
- runtime integration,
- the Developer Handbook.

Examples currently include documents such as:

- `animation-direction.md`
- `animation-registration-pipeline.md`
- `art-pipeline.md`
- `bai-mitko-external-animation-v1-...`
- `bai-mitko-simple-animation-test.md`
- `bulgarian-satire-intake.md`
- `chapter1-satire-seed-bank.md`
- `html-hud-and-inventory.md`
- `humor-bible.md`
- `image-prompts.md`
- `production-graphics-plan.md`
- `raster-scene-runtime.md`
- `runtime-art-coverage.md`
- `runtime-art-integration.md`
- `stateful-scene-layer-workflow.md`
- `visual-style-bible.md`

These documents often describe decisions that are important but do not belong directly inside source code.

---

# 8. `docs/Developer-Handbook/`

The Developer Handbook is intended to explain the project in a way that is useful months later.

Current handbook files include:

```text
docs/Developer-Handbook/
├── 00_Project_Overview.md
├── 01_Project_Structure.md
├── 02_Engine_Overview.md
├── 03_File_Cheat_Sheet.md
├── 13_Daily_Learning_Log.md
├── Glossary.md
└── PERSONAL_RULES.md
```

The handbook has several purposes.

It should help:

- remember how the project works,
- understand unfamiliar files,
- record important development knowledge,
- support learning,
- reduce dependence on memory,
- make future AI-assisted sessions more consistent.

---

## Why the Handbook Is Separate From Other Documentation

The repository already contains many specialized technical documents.

The Developer Handbook should not simply duplicate them.

Instead, it should act as a guided map.

For example:

```text
Developer Handbook
       ↓
explains the big picture
       ↓
points to specialized documents
       ↓
specialized documents provide deep detail
```

This keeps the handbook readable.

---

# 9. `docs/Prompts/`

The prompt library contains reusable instructions for Codex or another AI assistant.

Current files include:

```text
docs/Prompts/
├── 01_New_Feature.md
├── 02_Bug_Fix.md
├── 03_Code_Review.md
├── 04_Refactor.md
├── 05_Explain_File.md
└── 06_Documentation.md
```

These are not game runtime files.

They are development workflow tools.

They define how an AI should approach different types of work.

---

# 10. `test/` — Automated Tests

`test/` contains automated tests.

Tests help verify that expected behavior still works after changes.

They are especially useful for detecting regressions.

A regression means:

> Something that worked before stops working because of a new change.

The testing workflow is roughly:

```text
make change
    ↓
run tests
    ↓
tests pass?
   /      \
 yes       no
  ↓         ↓
continue   investigate
```

Tests are particularly important when changing reusable engine systems because one engine change may affect many scenes or chapters.

---

# 11. `tools/` — Development Utilities

`tools/` contains scripts and utilities used during development.

These are not necessarily part of the game runtime.

Examples seen during animation work include commands such as:

```text
node tools/unpack-external-animation-zips.js
node tools/inspect-external-animation-metadata.js
node tools/preview-external-animation-animations.js
node tools/build-external-runtime-staging.js
```

These tools help convert, inspect, prepare, or verify development resources.

A useful distinction is:

```text
src/
    =
code the running game needs

tools/
    =
code developers use to build or inspect the game
```

---

# 12. `target/` — Generated Development Output

`target/` contains generated outputs used during development.

This may include:

- generated previews,
- processed assets,
- temporary staging output,
- inspection output.

Files under `target/` may be ignored by Git.

That means they can exist on your computer without being committed to the repository.

This is normal for generated material.

---

## Why Generated Files Need Special Care

If a generated file is missing, the correct solution is often:

```text
run the generator again
```

rather than:

```text
manually recreate the generated file
```

Similarly, if a generated file changes unexpectedly, investigate the generator or source data first.

---

# 13. `AGENTS.md`

`AGENTS.md` is located at the repository root.

It contains important project-level instructions for AI development agents.

It covers areas such as:

- project goals,
- architecture rules,
- visual direction,
- content rules,
- localization,
- stable IDs,
- testing,
- approval requirements.

It should be treated as one of the highest-level project instruction files.

---

# 14. `00_START_SESSION.md`

`00_START_SESSION.md` is also located at the repository root.

It provides the startup procedure for a Codex session.

It tells Codex to read:

1. `AGENTS.md`
2. `docs/Developer-Handbook/PERSONAL_RULES.md`
3. `docs/Developer-Handbook/13_Daily_Learning_Log.md`

Then Codex should:

- summarize its understanding,
- identify conflicts,
- ask about unclear instructions,
- suggest the next logical task,
- wait for approval.

This creates continuity between sessions.

---

# 15. `index.html`

`index.html` is the browser entry page.

The browser initially loads this file.

It then connects to the JavaScript application.

A simplified startup path is:

```text
Browser
   ↓
index.html
   ↓
src/main.js
   ↓
Game
   ↓
Engine + Content + Assets
```

---

# 16. `package.json`

`package.json` describes the Node.js project.

It normally defines things such as:

- project metadata,
- dependencies,
- development scripts,
- test commands,
- build or development commands.

When you run:

```text
npm run dev
```

npm looks inside `package.json` for the definition of the `dev` script.

---

# 17. `package-lock.json`

`package-lock.json` records the exact dependency versions installed for the project.

Its job is to make dependency installation reproducible.

Think of the difference this way:

```text
package.json
    =
what packages the project wants

package-lock.json
    =
the exact package versions that were installed
```

This file is normally managed automatically by npm.

---

# How the Main Areas Work Together

Here is the repository structure as a workflow:

```text
                  DEVELOPMENT
                       │
          ┌────────────┴────────────┐
          ↓                         ↓
      assets_src/                 docs/
 source production files      knowledge / decisions
          │
          ↓
        tools/
 processing / generation
          │
          ↓
       assets/
 runtime-ready resources
          │
          │
          ├───────────────┐
          ↓               ↓
      src/content/     src/engine/
      game content     reusable logic
          │               │
          └───────┬───────┘
                  ↓
               Game.js
                  ↓
              Renderer
                  ↓
               Browser
```

This is simplified, but it captures the overall idea.

---

# Where Should a New File Go?

When adding something new, ask what responsibility it has.

### New reusable game behavior?

Usually:

```text
src/engine/
```

Example:

A reusable camera system.

### New Chapter 1 content?

Usually:

```text
src/content/chapter1/
```

Example:

Dialogue for a Chapter 1 character.

### Runtime artwork?

Usually:

```text
assets/
```

### Source artwork or production material?

Usually:

```text
assets_src/
```

### Development utility?

Usually:

```text
tools/
```

### Automated verification?

Usually:

```text
test/
```

### Design decision or technical explanation?

Usually:

```text
docs/
```

### Beginner-friendly project explanation?

Usually:

```text
docs/Developer-Handbook/
```

---

# Common Mistakes to Avoid

## Putting Chapter-Specific Logic Into the Engine

Bad mental model:

```text
Game.js knows exactly what Bai Mitko must say at the fountain.
```

Better:

```text
Game.js knows how interactions work.

Chapter 1 content defines what Bai Mitko says at the fountain.
```

---

## Editing Generated Files Instead of Their Source

Before editing a suspicious file, ask:

```text
Is this file generated?
```

If yes, find:

- its source,
- its generator,
- its build process.

---

## Mixing `assets/` and `assets_src/`

Remember:

```text
assets_src/
    ↓
production source

assets/
    ↓
runtime-ready output
```

---

## Treating Documentation as Runtime Code

Files under `docs/` guide development.

The running game normally does not depend on them directly.

---

## Editing `master` for Every Change

Use a branch for meaningful work.

This keeps `master` stable and makes review easier.

---

# Quick Folder Cheat Sheet

| Path | Main Responsibility |
| --- | --- |
| `src/engine/` | Reusable game systems |
| `src/content/` | Game and chapter content |
| `assets/` | Runtime-ready assets |
| `assets_src/` | Source / production assets |
| `docs/` | Technical and design documentation |
| `docs/Developer-Handbook/` | Guided project learning and reference |
| `docs/Prompts/` | Reusable AI workflows |
| `test/` | Automated tests |
| `tools/` | Development and asset-processing tools |
| `target/` | Generated development output |

---

# Remember

The easiest way to understand the BAIM repository is:

```text
src/engine/
    =
HOW the game works

src/content/
    =
WHAT happens in the game

assets/
    =
WHAT the player sees and hears at runtime

assets_src/
    =
WHERE production assets come from

tools/
    =
HOW development resources are processed

test/
    =
HOW behavior is verified

docs/
    =
WHY the project is built this way
```

And the most important architectural boundary is:

> Keep reusable engine behavior separate from chapter-specific content.

Next:

`02_Engine_Overview.md`

explains how the major systems inside `src/engine/` work together.