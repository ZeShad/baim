# Comrade Candidate Art And Animation Pipeline

This project is built for high-resolution 2D adventure art, not low-resolution placeholder graphics.
The current canvas rectangles are debug overlays only. Production scenes should use painted
backgrounds, depth metadata, object layers, and character animation assets.

## Target Look

- Modern high-resolution 2D painted adventure visuals.
- Inspired by 90s LucasArts staging: strong silhouettes, theatrical camera angles, readable props.
- Balkan provincial satire: dusty streets, bureaucratic beige, old posters, cheap plastic textures,
  smoke-yellowed interiors, absurd official signage.
- Runtime scene target: `1280x720` logical canvas.
- Source/background generation target: keep the highest useful original image under `assets_src/`;
  AI tools may produce different source resolutions.
- Runtime backgrounds and runtime scene layers under `assets/chapter1/scenes/` must be prepared at
  their final canvas-space pixel size before integration. The renderer draws them 1:1 and does not
  scale them to fit.

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

Layer and prop extraction is a manual production step when precision matters. AI-generated or
approved base art is acceptable as the starting point, but exact clipped props, z-order occluders,
sprite/video animation frames, removable objects, and later audio/music cues must be reviewed and
integrated manually. Do not rely on automatic AI clipping for final scene layers when Bai Mitko can
walk behind the object or when the object can be taken, removed, hidden, or animated.

Runtime layer placement uses `top`, `left`, `right`, and `bottom` in the `1280x720` logical canvas.
Defaults are `top: 0` and `left: 0`; use `right` or `bottom` for layers that should align to those
scene edges. Layer placement and z-order are authored in
`assets_src/chapter1/scenes/<scene>/layers.json` and compiled into
`src/content/chapter1/sceneLayers.generated.js`; `src/content/chapter1/scenes.js` should only import
the generated scene layer metadata. Runtime layers are drawn at their natural PNG size; do not use
metadata to scale them. See `docs/raster-scene-runtime.md`.

Scene geometry is data, not drawn into the background:

- `walkMask`: the production navigation surface. Use low-resolution raster masks and A* routing for
  Bai Mitko movement.
- `walkPolygons`: legacy/debug authoring context only; do not use polygons as the production
  movement system for new scenes.
- `perspectiveScale`: continuous horizon-to-front scaling and z sorting.
- `hotspots`: clickable polygons or rectangles.
- `exits`: transition areas.
- `anchors`: named stage positions for dialogue, puzzles, and cutscenes.

See `docs/raster-scene-runtime.md` for the fixed runtime model: raster walk masks, raster foreground
layers, and `0` frontmost / `100` horizon z ordering.

## Character Animation

The active Bai Mitko production path starts from the approved model sheet:

- `assets_src/characters/bai-mitko-model-sheet-v1.png` is the locked Bai Mitko identity source.
- New Bai Mitko poses and animation source frames must be generated or edited from that model sheet
  with strict identity preservation.
- For runtime pose/style continuity, use the closest approved green runtime source pose as the
  primary image anchor. For east-facing poses, `assets_src/characters/bai-mitko-idle-east-chroma-v1.png`
  is the primary style, canvas, lighting, scale, and rendering reference; the model sheet remains
  the secondary design authority.
- East-facing runtime pose sources must keep the same portrait source-canvas family as the approved
  east idle image: `1023x1537` proportions, matching apparent character height, head scale,
  baseline/feet zone, center of mass, and green padding logic. Reject landscape outputs before
  cleanup.
- Generate additional Bai Mitko poses as edits/variants of the approved runtime source image family,
  not as fresh standalone images from text plus model sheet only.
- Do not accept generated outputs that change his face, body proportions, outfit, moustache,
  friendly comic expression, or overall appeal.
- Reject outputs that change canvas ratio, framing, line weight, brush/detail density, green
  background treatment, lighting, facial construction, jacket stripe language, shoe style, or the
  existing runtime-pose image family.
- For walk production, author only east-facing source images/frames for now. Do not generate
  separate west walk images; mirror east for west when needed.
- North and south walk images/animations are deferred and should not be generated in the current
  pass.
- Use clean green-background source images for the active cutout/removal pipeline.
- Keep source images under `assets_src/characters/` and cleaned runtime images under `assets/`.
- Character sprite sheets and atlases keep their authored/runtime atlas resolution. Do not force
  character sprites into `1280x720`; Bai Mitko is scaled in context by the runtime character renderer.
- Source-to-runtime character cutouts use a deterministic canvas transform: remove green, scale the
  whole source canvas by `CHARACTER_SOURCE_SCALE = 0.6`, then add
  `CHARACTER_CUTOUT_MARGIN_RATIO = 0.15` transparent canvas margin on all sides. Do not crop to each
  pose's silhouette; matching source canvases must produce matching runtime canvas size and stable
  sprite placement. Use the same constants for animation cutouts.
- Green-removal utilities must only convert existing listed source files. Do not generate additional
  Bai Mitko poses or directions unless explicitly requested.
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
- current walk cycle reference: east-facing source only, with west mirrored from east;
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
