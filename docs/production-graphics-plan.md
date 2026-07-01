# Production Graphics Plan

## Decision

The game should use high-resolution painted 2D scenes with metadata-driven geometry and sprite-sheet
character animation.

`assets_src/characters/bai-mitko-model-sheet-v1.png` is the locked Bai Mitko identity source. New
Bai Mitko poses, walk references, sprite frames, and animation inputs must be generated or edited
from that approved model sheet as a strict identity-preservation workflow. If the face, body
proportions, outfit, or friendly comic appeal drift, the output is rejected.

External/Ludo.ai animation output is deferred review material until the model-sheet-driven character
variables are stable again.

## Recommended Stack

### Backgrounds And Environments

Use AI-assisted concept art plus paintover/cleanup.

Production scene resolution:

- Logical game canvas: `1280x720`
- Source painting: `2560x1440`
- Optional ultra source for marketing/key art: `3840x2160`

Each scene should be delivered as:

```text
background.webp
foreground.webp
props.webp
lighting.webp
scene.geometry.json
```

The painted image is never the only source of truth. Gameplay geometry remains in JSON:

- walk polygons
- depth zones
- hotspot shapes
- exit shapes
- dialogue anchors
- occlusion layers

### Characters

Use reviewed sprite sheets/atlases with metadata. For Bai Mitko, the approved model sheet is the
identity contract for every generated pose and animation source. Green-screen removal remains the
active cutout pipeline for generated character assets, but the chroma source image itself must first
match the locked model-sheet design.

Existing Ludo.ai ZIP exports remain under `assets_src/characters/bai_mitko/external_animation_v1/`
as deferred review/import material. Do not treat them as the current character-design authority.

Rive is useful for menus, logos, UI widgets, election meters, posters, and small animated signs.
It is not the first choice for painterly full-body adventure characters.

## Modern Bulgarian Town Visual Target

The town should feel current, not medieval or generic Eastern European stock art:

- cracked post-socialist pavement mixed with new EU-funded curbs;
- old panel blocks, cheap PVC windows, satellite dishes, air conditioners;
- faded municipal beige corridors and plastic plants;
- campaign posters layered over old posters;
- dusty cars, patched asphalt, pharmacy signs, lottery kiosks, kebapche smoke;
- renovated-but-already-broken public works;
- Bulgarian signs left in-world, with localized Look descriptions;
- strong caricature silhouettes but painterly textures.

Avoid:

- generic fantasy village;
- Soviet museum look everywhere;
- tiny pixel art;
- realistic photo collage;
- dark gritty noir palette for every scene;
- direct real politician likenesses or real-party logos.

## Asset Contracts

### Character Source Package

```text
assets_src/characters/bai_mitko/
  external_animation_v1/
    input/
    unpacked/
    previews/
    runtime_staging/
    reports/
```

### Runtime Character Package

```text
assets/chapter1/characters/bai_mitko/
  bai_mitko.webp
  bai_mitko.atlas.json
  portraits.webp
  portraits.atlas.json
```

### Required Bai Mitko Animations

- `idle`
- `walk_down`
- `walk_up`
- `walk_side`
- `talk_neutral`
- `talk_smug`
- `look`
- `use`
- `take`
- `play_accordion`
- `drink`
- `react_shocked`

## Image Generation Plan

Use ChatGPT image generation in phases:

1. Key art mood frame for the whole game.
2. Bai Mitko character sheet.
3. Three Chapter 1 environment concepts: apartment, village square, mehana.
4. Selected scene background final pass.
5. Prop and inventory icons with clean transparent output.
6. Bai Mitko pose and animation source frames generated from the approved model sheet, on clean
   green background for the green-removal pipeline.
7. Dialogue portraits and expression sheets.

AI output is source art, not final animation by itself. For Bai Mitko motion, use model-sheet-locked
pose/source generation first, then green removal, reviewed sprite sheets, and JSON frame metadata.
External animation exports are allowed only after the source character variables are stable.

## First Art Milestone

Generate and approve these before producing all assets:

1. `style.key_art.chapter1`
2. `character.model_sheet.bai_mitko`
3. `scene.concept.village_square`
4. `scene.concept.mehana`

No final batch production should start until those four are visually aligned.

## Replaceable Topical Satire Surfaces

Scene art should leave space for replaceable topical satire:

- poster layers
- bulletin boards
- TV screens
- newspaper scraps
- municipality notices
- election notices
- wall signs

Design these surfaces so topical text jokes can be updated later without repainting the whole background when possible.

Practical rules:

- Keep text-heavy posters on separable layers when possible.
- Avoid baking important topical jokes into complex background paint.
- Leave clean rectangular or warped-poster zones for later replacement.
- Use fictional slogans and symbols only.
- Keep Bulgarian in-world signs readable enough for Look text support, but do not rely on tiny text as the only joke.
