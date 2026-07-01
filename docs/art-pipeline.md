# Comrade Candidate Art And Animation Pipeline

This project is built for high-resolution 2D adventure art, not low-resolution placeholder graphics.
The current canvas rectangles are debug overlays only. Production scenes should use painted
backgrounds, depth metadata, object layers, and character animation assets.

## Target Look

- Modern high-resolution 2D painted adventure visuals.
- Inspired by 90s LucasArts staging: strong silhouettes, theatrical camera angles, readable props.
- Balkan provincial satire: dusty streets, bureaucratic beige, old posters, cheap plastic textures,
  smoke-yellowed interiors, absurd official signage.
- Output target: `1280x720` logical canvas, with production backgrounds authored at `2560x1440`
  where possible and downsampled by the browser.

## Scene Construction

Each scene is a package:

```text
assets/chapter1/scenes/<scene_slug>/
  background.webp
  foreground.webp
  props.webp
  scene.geometry.json
  scene.preview.png
```

Use separate layers when a character must walk behind or in front of an object:

- `background`: the full painted room or exterior.
- `midgroundProps`: clickable props that can animate or change.
- `foreground`: occluders such as tables, door frames, counters, smoke, hanging signs.
- `lighting`: optional soft overlays if the scene needs mood changes.

Scene geometry is data, not drawn into the background:

- `walkPolygons`: where Bai Mitko can walk.
- `depthZones`: y-range based scaling and sorting.
- `hotspots`: clickable polygons or rectangles.
- `exits`: transition areas.
- `anchors`: named stage positions for dialogue, puzzles, and cutscenes.

## Character Animation

The active Bai Mitko production path starts from the approved model sheet:

- `assets_src/characters/bai-mitko-model-sheet-v1.png` is the locked Bai Mitko identity source.
- New Bai Mitko poses and animation source frames must be generated or edited from that model sheet
  with strict identity preservation.
- Do not accept generated outputs that change his face, body proportions, outfit, moustache,
  friendly comic expression, or overall appeal.
- Use clean green-background source images for the active cutout/removal pipeline.
- Keep source images under `assets_src/characters/` and cleaned runtime images under `assets/`.
- External Ludo.ai ZIP exports under `assets_src/characters/bai_mitko/external_animation_v1/` are
  deferred review/import material until the model-sheet-driven character variables are stable.

## AI Image Generation Use

Use AI image generation for:

- mood paintings;
- final or near-final backgrounds;
- character concept sheets;
- item icons;
- poster art;
- dialogue portrait passes.

Do not rely on AI for final animation consistency by itself. Use it to establish design and key
poses, then clean/paint/export controlled frames.

Recommended asset flow:

```text
approved model sheet -> identity-preserving pose/source edit -> green-removal cleanup -> atlas/layer export -> engine manifest
```

## Character Sheet Requirements

For each character:

- neutral front, 3/4, side, and back views;
- clear silhouette at 160-240 px in game scale;
- separate expression sheet for portraits;
- walk cycle reference with 6-8 frames per direction;
- talk loop with 2-4 mouth/gesture frames;
- no baked shadows under feet; shadows are engine-side or scene-side.

## Background Prompt Requirements

Every background prompt must include:

- exact scene ID;
- camera angle;
- clear floor/walkable area;
- foreground occluders as separate layer candidates;
- no character baked into the background;
- no UI;
- no watermark;
- leave gameplay-readable space around exits and important props.

Example:

```text
Scene ID: scene.chapter1.apartment
Asset type: high-resolution 2D painted adventure game background
Camera: fixed 3/4 side view, theatrical point-and-click staging
Composition: readable floor area in lower half, door exit on right, key props separated
Style: sharp hand-painted 90s adventure game feel, modern resolution, expressive shapes
Constraints: no characters, no UI, no text except Bulgarian posters when requested
```

## Geometry Naming

Stable IDs must not change after content ships:

- `scene.chapter1.apartment`
- `walk.chapter1.apartment.main`
- `hotspot.apartment.accordion`
- `anchor.apartment.door`
- `layer.apartment.foreground`

The renderer may change, but these IDs are save-game and content contracts.
