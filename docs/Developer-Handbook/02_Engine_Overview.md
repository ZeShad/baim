# BAIM / Comrade Candidate — Engine Overview

## Purpose

This chapter explains how the main systems inside `src/engine/` work together.

The goal is to answer questions such as:

- What is the engine responsible for?
- What does `Game.js` coordinate?
- How does player input become movement or interaction?
- How do rendering and animation fit together?
- How do dialogue, inventory, quests, localization, and saving interact?
- What are geometry and stable IDs used for?
- Which systems own which responsibilities?

This chapter focuses on the big picture.

For a quick per-file reference, see:

`03_File_Cheat_Sheet.md`

---

# The Engine in One Sentence

The engine is the reusable machinery that makes the game function.

A useful mental model is:

```text
Content says WHAT should happen.

Engine systems know HOW to make it happen.
```

For example:

```text
Chapter content:
"Clicking this door moves the player to another scene."

Engine:
"Here is how clicks, interactions, scene transitions,
movement, rendering, and saving work."
```

The engine should not know the story of Chapter 1 unless there is a very good architectural reason.

---

# High-Level Runtime Flow

At a simplified level, the game works something like this:

```text
Player
  ↓
Mouse / keyboard input
  ↓
Game.js
  ↓
Determine what the player is trying to do
  ↓
Relevant engine system
  ↓
Update game state
  ↓
Renderer
  ↓
Updated scene appears on screen
```

Not every action uses every system.

For example:

```text
click ground
    ↓
MovementSystem
    ↓
character moves
    ↓
Renderer + AnimationPlayer
```

while:

```text
click NPC with TALK
    ↓
DialogueSystem
    ↓
dialogue state changes
    ↓
Renderer / UI
```

---

# 1. `Game.js` — Main Coordinator

`Game.js` is one of the central files in the engine.

Its main job is coordination.

Think of it as the manager that knows which specialized system should handle a situation.

It may coordinate things such as:

- current scene,
- player input,
- player state,
- selected action,
- interactions,
- movement,
- dialogue,
- inventory,
- quests,
- scene changes,
- rendering,
- saving and loading.

The key idea is:

> `Game.js` should coordinate systems, not become every system.

---

## Manager Analogy

Imagine a film production.

The director does not personally:

- operate every camera,
- record every sound,
- build every set,
- edit every frame.

The director coordinates specialists.

Similarly:

```text
Game.js
    =
coordination

MovementSystem.js
    =
movement specialist

DialogueSystem.js
    =
dialogue specialist

Renderer.js
    =
visual drawing specialist
```

That separation makes the project easier to understand and extend.

---

# 2. Player Input

In a point-and-click game, much of the runtime begins with player input.

For example:

```text
player moves mouse
player clicks
player selects LOOK / TALK / USE / TAKE
```

The game must determine:

```text
Where did the player click?

What is there?

Which action is selected?

Is the click movement or interaction?

What should happen next?
```

This decision-making usually involves `Game.js`, scene data, geometry, and specialized systems.

---

# 3. Clicking Empty Ground

A simplified movement flow looks like this:

```text
Player clicks ground
        ↓
Game.js receives click
        ↓
Determine world coordinates
        ↓
Check walkable area
        ↓
MovementSystem receives target
        ↓
Character starts moving
        ↓
AnimationPlayer selects walking animation
        ↓
Renderer draws updated character position
```

The exact implementation may differ internally, but this is the useful mental model.

---

# 4. `MovementSystem.js` — Character Movement

`MovementSystem.js` is responsible for reusable movement behavior.

Its responsibilities may include things such as:

- receiving a destination,
- calculating movement direction,
- updating character position,
- stopping at the destination,
- respecting walkable areas,
- helping determine animation direction.

Movement should not need to know:

```text
"This is the village square from Chapter 1."
```

It should understand:

```text
"This character wants to move from A to B."
```

That makes it reusable.

---

## Movement Is State Over Time

Movement normally does not happen instantly.

Instead:

```text
start position
    ↓
frame 1
    ↓
frame 2
    ↓
frame 3
    ↓
...
    ↓
destination
```

The engine updates the character position repeatedly while the game is running.

This repeated update process is part of the game loop.

---

# 5. The Game Loop

Games continuously update while they are running.

A simplified loop is:

```text
read current state
      ↓
update movement
      ↓
update animation
      ↓
update other active systems
      ↓
draw frame
      ↓
repeat
```

This happens many times per second.

The loop creates the illusion of continuous movement and animation.

Without repeated updates, Bai Mitko would simply jump from one position to another.

---

# 6. `Renderer.js` — Drawing the Game

`Renderer.js` is responsible for turning current game state into visible output.

The renderer may need to draw things such as:

- scene backgrounds,
- scene layers,
- characters,
- NPCs,
- interactive objects,
- debugging geometry,
- visual overlays.

A useful mental model is:

```text
Game state
    ↓
Renderer
    ↓
Pixels on screen
```

The renderer should not normally decide the story.

It should draw what the current state tells it to draw.

---

## State vs Rendering

This distinction is important.

Example:

```text
Game state:
Bai Mitko position = x: 500, y: 320

Renderer:
draw Bai Mitko at x: 500, y: 320
```

The renderer displays state.

It should not secretly create unrelated gameplay state.

---

# 7. `AnimationPlayer.js` — Playing Character Animation

`AnimationPlayer.js` handles playback of animation data.

It may be responsible for things such as:

- selecting animation clips,
- advancing animation frames,
- controlling timing,
- looping animations,
- switching between idle and walking,
- determining the currently visible animation frame.

A simplified flow is:

```text
MovementSystem:
character is walking left
        ↓
AnimationPlayer:
play walk-left
        ↓
current animation frame
        ↓
Renderer:
draw that frame
```

---

# 8. `CharacterRenderMath.js` — Character Drawing Calculations

Character rendering often requires calculations that do not belong directly in `Renderer.js`.

Examples may include:

- sprite scale,
- anchor position,
- character feet position,
- offsets,
- alignment,
- render size.

`CharacterRenderMath.js` keeps these calculations separate.

That helps prevent `Renderer.js` from becoming overloaded with character-specific math.

A useful distinction is:

```text
CharacterRenderMath.js
    =
calculate where/how the character should be drawn

Renderer.js
    =
actually draw it
```

---

# 9. `AssetLoader.js` — Loading Runtime Assets

Before the renderer can display artwork, the game needs to load the required files.

`AssetLoader.js` handles asset loading.

Examples include:

- background images,
- sprites,
- animation images,
- other runtime resources.

A simplified flow is:

```text
asset path
    ↓
AssetLoader
    ↓
browser loads file
    ↓
loaded asset becomes available
    ↓
Renderer uses it
```

---

## Why Asset Loading Is Separate

Without a dedicated loader, every system might try to load files independently.

That could lead to duplicated logic.

Instead:

```text
AssetLoader.js
    =
one place for reusable loading behavior
```

This also makes missing-asset problems easier to investigate.

---

# 10. Interaction Flow

Point-and-click gameplay is more than movement.

Suppose the player clicks an object.

The game may need to determine:

```text
Which hotspot was clicked?

Which action is selected?

Does this object support that action?

Does the player need to walk closer first?

What response should occur?
```

A simplified interaction flow might be:

```text
Player clicks object
        ↓
Game.js identifies hotspot
        ↓
Selected action is checked
        ↓
Chapter content defines response
        ↓
Relevant system performs effect
        ↓
Game state changes
        ↓
Renderer updates
```

---

# 11. Actions: LOOK / TALK / USE / TAKE

These actions represent player intent.

For example:

```text
LOOK
    =
inspect something

TALK
    =
start dialogue

USE
    =
interact with an object or use an item

TAKE
    =
attempt to collect something
```

The engine should understand the general concept of an action.

Chapter content should define the specific response for a particular object or character.

Example:

```text
Engine:
TAKE means "attempt an acquisition interaction"

Chapter content:
TAKE + rusty bucket
    =
add bucket to inventory
```

---

# 12. `DialogueSystem.js` — Conversations

`DialogueSystem.js` manages dialogue behavior.

Possible responsibilities include:

- starting dialogue,
- tracking the current dialogue node,
- presenting choices,
- moving between dialogue nodes,
- applying dialogue effects,
- ending conversations.

A simplified flow:

```text
Player chooses TALK
        ↓
Game finds NPC interaction
        ↓
DialogueSystem starts conversation
        ↓
Dialogue node displayed
        ↓
Player chooses response
        ↓
DialogueSystem moves to next node
        ↓
possible game-state effect
```

---

## Dialogue Can Affect the Game

Dialogue is not necessarily only text.

A dialogue choice may cause:

```text
quest starts

item received

flag changes

NPC state changes

new dialogue becomes available
```

That means the dialogue system may cooperate with:

- inventory,
- quests,
- general game state,
- saving.

---

# 13. `InventorySystem.js` — Player Items

`InventorySystem.js` manages inventory state.

Typical responsibilities may include:

- adding items,
- removing items,
- checking whether an item is owned,
- tracking inventory contents.

A simplified example:

```text
Player takes key
      ↓
InventorySystem.add(key)
      ↓
inventory state changes
      ↓
UI displays key
```

Later:

```text
Player uses key on door
      ↓
InventorySystem checks for key
      ↓
interaction succeeds
```

---

# 14. `QuestSystem.js` — Quest State

`QuestSystem.js` manages quest-related progress.

A quest may move through states such as:

```text
not started
    ↓
started
    ↓
objective completed
    ↓
completed
```

The exact structure depends on the project data.

The important idea is that quest progression should be managed consistently rather than being scattered randomly through unrelated files.

---

## Example Quest Interaction

```text
Talk to NPC
    ↓
DialogueSystem
    ↓
Quest starts
    ↓
QuestSystem records state
    ↓
Player obtains item
    ↓
InventorySystem records item
    ↓
Return to NPC
    ↓
QuestSystem recognizes requirement
    ↓
Quest completes
```

Several systems cooperate, but each still has a specialized responsibility.

---

# 15. `Localization.js` — Bulgarian and English

`Localization.js` handles visible text in multiple languages.

The project supports:

- Bulgarian
- English

The goal is to avoid hardcoding visible text throughout the engine.

Instead of something like:

```js
button.textContent = "Talk";
```

the preferred architecture is conceptually closer to:

```text
localization key
      ↓
Localization
      ↓
current language
      ↓
translated text
```

This allows the same game systems to work in both languages.

---

# 16. `SaveSystem.js` — Saving and Loading State

`SaveSystem.js` is responsible for preserving game progress.

A save may need to remember things such as:

- current scene,
- player position,
- inventory,
- quest state,
- interaction state,
- important flags,
- language or settings where appropriate.

A simplified flow:

```text
Current game state
       ↓
SaveSystem
       ↓
serialized save data
       ↓
stored save
```

Loading reverses the process:

```text
stored save
    ↓
SaveSystem
    ↓
restore game state
    ↓
game continues
```

---

# Why Stable IDs Matter for Saves

Suppose a save contains:

```text
scene_id = village_square
```

If the project later casually renames that ID to:

```text
main_square
```

the old save may no longer know which scene to restore.

That is one reason stable IDs are protected.

IDs connect systems across time.

---

# 17. `ids.js` — Stable Identifiers

`ids.js` helps centralize or define stable identifiers used by the project.

IDs may represent things such as:

- scenes,
- NPCs,
- items,
- quests,
- hotspots,
- exits,
- anchors,
- other game entities.

The important principle is:

> A name used as an ID is not just cosmetic text.

It may be referenced by:

```text
content
quests
inventory
dialogue
save files
scene transitions
tests
```

That is why renaming stable IDs requires care.

---

# 18. `geometry.js` — General Geometry Helpers

Point-and-click games rely heavily on geometry.

The engine needs to answer questions such as:

```text
Is this point inside this polygon?

Where did the player click?

Does this position belong to a walkable area?

Where is the nearest valid point?
```

`geometry.js` contains reusable geometric calculations.

These helpers should generally not know about a specific Chapter 1 scene.

They should solve geometry problems in a generic way.

---

# 19. `SceneGeometry.js` — Scene-Specific Geometry Handling

`SceneGeometry.js` works with geometry in the context of scenes.

This can include concepts such as:

- walkable zones,
- scene boundaries,
- hotspots,
- exits,
- anchors,
- coordinate relationships.

A useful distinction is:

```text
geometry.js
    =
generic geometry mathematics

SceneGeometry.js
    =
use geometry concepts for game scenes
```

---

# 20. Walkable Areas

The player should not be able to walk everywhere in a painted background.

For example, Bai Mitko should not walk:

```text
through a wall

onto the sky

inside a decorative building facade

outside valid scene space
```

Walkable geometry defines where movement is allowed.

A simplified flow:

```text
Player clicks location
      ↓
SceneGeometry
      ↓
Is destination walkable?
     / \
   yes  no
    ↓    ↓
 move   reject or adjust target
```

---

# 21. Hotspots

A hotspot is an interactive region in a scene.

Examples:

```text
door

NPC

fountain

table

poster

item
```

A hotspot typically connects screen/world geometry with game content.

Conceptually:

```text
geometry
    ↓
hotspot ID
    ↓
interaction definition
    ↓
response
```

This is another reason stable IDs matter.

---

# 22. Exits and Scene Changes

An exit is an interactive region or action that moves the player to another scene.

A simplified flow:

```text
Player interacts with exit
        ↓
Game checks exit definition
        ↓
current scene changes
        ↓
new scene data loads
        ↓
player placed at destination anchor
        ↓
Renderer draws new scene
```

Scene transitions may also need to interact with:

- save state,
- player position,
- quest state,
- dialogue state,
- asset loading.

---

# 23. Anchors

Anchors are named positions used by scenes or interactions.

An anchor may represent something like:

```text
where the player stands near a door

where the player appears after entering a scene

where the player should stand to talk to an NPC
```

Using named anchors is often better than scattering unexplained coordinates throughout the code.

Conceptually:

```text
door_interaction_position
        ↓
anchor ID
        ↓
scene coordinate
```

---

# 24. `SceneEditor.js` — Development Scene Editing

`SceneEditor.js` supports development tools for editing or inspecting scene data.

The editor can help work with things such as:

- walkable areas,
- hotspots,
- anchors,
- exits,
- scene geometry,
- placement.

This is development functionality, not normal player gameplay.

Its purpose is to make scene authoring easier and less error-prone.

---

# 25. Engine vs Editor

A useful distinction is:

```text
Game runtime
    =
what the player uses

Scene editor
    =
what developers use to create or adjust the game
```

The editor may use some of the same underlying geometry concepts as the runtime.

That is useful because both can operate on the same scene data model.

---

# 26. How Several Systems Work Together

Consider a simple example:

> Bai Mitko walks to an NPC and starts a conversation.

A simplified runtime sequence might be:

```text
1. Player clicks NPC with TALK

2. Game.js identifies NPC hotspot

3. Game checks interaction data

4. MovementSystem moves Bai Mitko toward talk anchor

5. AnimationPlayer plays walking animation

6. Renderer draws movement

7. Bai Mitko reaches destination

8. DialogueSystem starts NPC conversation

9. Localization provides Bulgarian or English text

10. Renderer / UI displays dialogue

11. Dialogue choice changes quest state

12. QuestSystem records change

13. SaveSystem can later preserve that state
```

This is why the engine is composed of multiple systems.

No single file needs to do everything.

---

# 27. Another Example — Taking an Item

Suppose Bai Mitko takes an object.

```text
Player selects TAKE
      ↓
clicks item hotspot
      ↓
Game.js identifies interaction
      ↓
content defines TAKE response
      ↓
InventorySystem adds item
      ↓
scene state changes
      ↓
Renderer stops drawing collected object
      ↓
inventory UI shows item
      ↓
SaveSystem can preserve new state
```

Again, several systems cooperate.

---

# 28. Another Example — Using an Item

Suppose the player uses a key on a locked door.

```text
Player selects key
      ↓
clicks door
      ↓
Game checks interaction
      ↓
InventorySystem confirms key exists
      ↓
content defines successful USE result
      ↓
door state changes
      ↓
possible quest state changes
      ↓
Renderer shows new state
      ↓
SaveSystem preserves result
```

---

# 29. State Is the Shared Reality of the Game

Many engine systems work by reading or changing game state.

Game state can include things such as:

```text
current scene

player position

current action

inventory contents

quest progress

dialogue flags

scene object states

collected items
```

The renderer then reflects that state visually.

A useful model is:

```text
Player action
    ↓
state changes
    ↓
renderer shows new state
```

---

# 30. Avoiding Hidden State

State should not be secretly duplicated across unrelated systems when avoidable.

For example, if quest completion is stored in one authoritative place, another system should not maintain an unrelated second version of the same truth.

Duplicated state can cause bugs such as:

```text
QuestSystem says quest is complete

but

DialogueSystem thinks quest is incomplete
```

Clear ownership of state makes systems easier to reason about.

---

# 31. Engine Boundaries

A good engine file has a clear responsibility.

For example:

```text
MovementSystem
    =
movement

DialogueSystem
    =
dialogue

InventorySystem
    =
inventory

QuestSystem
    =
quests

SaveSystem
    =
persistence
```

Problems often appear when responsibilities become blurred.

Example:

```text
MovementSystem starts modifying quest state directly.
```

That might work temporarily, but it creates hidden dependencies.

A cleaner design would normally coordinate that through the appropriate game/content logic.

---

# 32. Data-Driven Architecture

A major BAIM design principle is that content should be data-driven where practical.

Instead of writing custom code for every object:

```text
if clicked fountain...
if clicked mayor...
if clicked apartment door...
if clicked poster...
```

the game should prefer reusable interaction logic connected to content data.

Conceptually:

```text
hotspot ID
    ↓
interaction data
    ↓
selected action
    ↓
defined response
```

This becomes increasingly important as the game grows.

---

# 33. Why This Matters for Chapter 2

Suppose Chapter 2 adds:

```text
new scenes
new NPCs
new quests
new dialogue
new items
```

A good architecture should allow most of that work to happen primarily in content and assets.

We do not want Chapter 2 to require:

```text
rewrite MovementSystem

rewrite DialogueSystem

rewrite InventorySystem

rewrite SaveSystem
```

The engine should already provide those capabilities.

---

# 34. Dependencies Between Systems

Systems are not completely isolated.

They cooperate.

For example:

```text
Game
 ├─ Movement
 ├─ Dialogue
 ├─ Inventory
 ├─ Quests
 ├─ Localization
 ├─ Save
 ├─ Animation
 ├─ Assets
 └─ Renderer
```

The important question is not:

> Do systems ever communicate?

They must.

The important question is:

> Is the communication clear, intentional, and owned by the correct layer?

---

# 35. Debugging by Following the Flow

Understanding system boundaries helps debugging.

Suppose Bai Mitko does not appear.

Instead of randomly changing files, follow the pipeline:

```text
Does character data exist?
        ↓
Did AssetLoader load the sprite?
        ↓
Does animation data exist?
        ↓
Does AnimationPlayer have a valid frame?
        ↓
Are render calculations valid?
        ↓
Does Renderer draw the character?
```

This narrows the problem systematically.

---

# 36. Debugging Movement

If Bai Mitko does not move after a click:

```text
Did Game.js receive the click?
        ↓
Was the click converted correctly?
        ↓
Is the destination walkable?
        ↓
Did MovementSystem receive a target?
        ↓
Is movement state updating?
        ↓
Is Renderer drawing the new position?
```

This is much better than immediately rewriting `MovementSystem.js`.

---

# 37. Debugging Dialogue

If dialogue does not start:

```text
Was the NPC hotspot detected?
        ↓
Was TALK selected?
        ↓
Does content define the interaction?
        ↓
Did DialogueSystem receive the dialogue?
        ↓
Does the localization key exist?
        ↓
Is the dialogue UI being rendered?
```

Again, follow the pipeline.

---

# 38. Debugging Saves

If loading produces incorrect state:

```text
Was the expected state saved?
        ↓
Are stable IDs still valid?
        ↓
Did SaveSystem deserialize correctly?
        ↓
Did each system restore its state?
        ↓
Did Renderer reflect restored state?
```

This is why save-related changes deserve careful testing.

---

# 39. Tests and Engine Changes

Reusable engine changes have a larger possible blast radius than content changes.

For example:

```text
change MovementSystem
    ↓
may affect every scene

change SaveSystem
    ↓
may affect every saved game

change Localization
    ↓
may affect every visible string
```

That is why `AGENTS.md` specifically requires testing when changing important systems.

---

# 40. When to Add a New Engine System

Do not create a new engine file just because a feature is new.

First ask:

```text
Does an existing system already own this responsibility?
```

Create a new system when the responsibility is:

- reusable,
- distinct,
- large enough to deserve separation,
- likely to be used across multiple content areas.

Example:

A reusable camera system might eventually deserve:

```text
CameraSystem.js
```

But a single Chapter 1 joke does not.

---

# 41. When NOT to Modify the Engine

If the request is purely content-specific, the engine may not need to change at all.

Examples:

```text
new NPC dialogue

new Chapter 1 hotspot

new quest text

new item description

new scene art mapping
```

These should usually begin in content, not engine code.

---

# 42. Current Engine Mental Map

For learning purposes, remember the files like this:

```text
Game.js
    =
coordinates everything

Renderer.js
    =
draws the game

MovementSystem.js
    =
moves characters

AnimationPlayer.js
    =
plays animation

AssetLoader.js
    =
loads runtime files

CharacterRenderMath.js
    =
calculates character drawing geometry

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
provides BG / EN text

SaveSystem.js
    =
preserves progress

geometry.js
    =
generic geometry calculations

SceneGeometry.js
    =
scene-specific geometry handling

SceneEditor.js
    =
developer scene-editing tools

ids.js
    =
stable project identifiers
```

---

# 43. The Most Important Runtime Flow to Remember

For a beginner, this is the main flow worth remembering:

```text
PLAYER DOES SOMETHING
        ↓
Game.js figures out what it means
        ↓
specialized system performs the work
        ↓
game state changes
        ↓
Renderer displays the new state
```

Examples:

```text
click ground
    ↓
MovementSystem

talk to NPC
    ↓
DialogueSystem

take item
    ↓
InventorySystem

complete objective
    ↓
QuestSystem
```

---

# 44. The Most Important Architecture Rule

The engine should remain reusable.

That means:

```text
ENGINE
    =
general capabilities

CONTENT
    =
specific story, scenes, characters, and interactions
```

If Chapter 1-specific logic starts spreading through `src/engine/`, future chapters become harder to build.

---

# Quick Engine Cheat Sheet

| File | Main Responsibility |
| --- | --- |
| `Game.js` | Main coordination |
| `Renderer.js` | Draw current game state |
| `MovementSystem.js` | Character movement |
| `AnimationPlayer.js` | Animation playback |
| `AssetLoader.js` | Runtime asset loading |
| `CharacterRenderMath.js` | Character render calculations |
| `DialogueSystem.js` | Dialogue flow |
| `InventorySystem.js` | Inventory state |
| `QuestSystem.js` | Quest progress |
| `Localization.js` | Bulgarian / English text |
| `SaveSystem.js` | Save and load |
| `geometry.js` | Generic geometry helpers |
| `SceneGeometry.js` | Scene geometry |
| `SceneEditor.js` | Scene development tools |
| `ids.js` | Stable IDs |

---

# Remember

The engine is not the story.

The engine is the reusable machinery that allows the story to work.

The easiest mental model is:

```text
Game.js
    =
traffic controller

Specialized systems
    =
experts that do individual jobs

Game state
    =
the current truth of the game

Renderer
    =
shows that truth to the player

Content
    =
defines what happens in this particular game
```

And the most important runtime pattern is:

```text
Input
  ↓
Game coordination
  ↓
Specialized system
  ↓
State change
  ↓
Rendering
```

Next:

`03_File_Cheat_Sheet.md`

provides a faster reference for remembering what each important file does.