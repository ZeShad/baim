# External Animation Registration Pipeline

## Goal

Fit a generated transparent animation to the game without hand-tuning frame offsets. Registration has
two independent stages and both must pass verification:

1. **Clip stabilization** aligns every animation frame to a chosen frame inside the clip.
2. **Execution registration** aligns the stabilized clip to the pixels visible at the exact game-state
   and world position where the action executes.

Scale is solved or approved before translation. Global placement must never be folded into per-frame
offsets.

## Reference Providers

The fitter consumes an RGBA reference canvas. The source of that canvas is replaceable:

- `background`: the static scene background; sufficient for the Chapter 1 apartment window.
- `renderedSceneState`: set `referencePath` to a deterministic 1280x720 engine capture containing enabled
  layers and stateful props immediately before the action begins.
- `asset`: set `referencePath` to a named prop/layer render when an action must register to one isolated
  runtime layer.

The algorithm must not contain apartment or Chapter 1 assumptions. A fit specification uses stable scene,
object, action, and fixture IDs.

## Fit Specification

Each authored action may declare registration metadata in the external-animation selection source:

```json
{
  "registration": {
    "referenceProvider": "background",
    "sceneId": "scene.chapter1.apartment",
    "sceneObjectId": "window",
    "verb": "look",
    "referenceFrame": 0,
    "stabilizationRoi": { "x": 275, "y": 690, "w": 330, "h": 440 },
    "sceneMarkerRects": [],
    "sceneSearchRect": { "x": 105, "y": 35, "w": 330, "h": 390 },
    "scaleRange": { "min": 1.05, "max": 1.14, "step": 0.001 },
    "acceptance": { "minimumGlobalScore": 0.9, "minimumFrameScore": 0.9 }
  }
}
```

ROIs use source-frame pixels and are authored approximations, not final offsets. They identify stable evidence
and exclude moving limbs, transparent padding, and unrelated generated pixels.

## Adding A New Ludo Action

1. Put the Ludo ZIP in `assets_src/characters/bai_mitko/external_animation_v1/input/` and add the animation
   selection entry without hand-authored offsets.
2. Run `node tools/build-external-runtime-staging.js` once so frame rectangles and the transparent runtime
   sheet exist.
3. Add a `registration` block. `stabilizationRoi` covers stable character pixels; `sceneMarkerRects` cover
   only retained scene evidence; `sceneSearchRect` limits the expected object area; `scaleRange` is a narrow
   plausible range rather than a final guessed value.
4. Run `npm run fit:action -- <animation_id> --write`, or open `?edit=1`, select **Actions**, and press
   **Auto-fit**.
5. Inspect `target/external_animation_v1/registration/<animation_id>/`: the marker overlay, full action on
   scene, and JSON report show the evidence, result, and confidence.
6. Run `npm run verify:action-render -- <animation_id>` and inspect the production-canvas entry, middle, and
   exit frames under `browser-frames/`.
7. Run `npm test`. Acceptance requires both global and minimum per-frame scores to satisfy configured limits.

The fitter writes `scale`, global `offsetX`/`offsetY`, and dense per-frame `offsets` independently.

## Stage 1: Clip Stabilization

- Render source frames offscreen with the same frame rectangles, mirroring, and scale used by the engine.
- Use alpha as the primary mask.
- Register a stable character ROI, normally trousers and feet, to the action reference frame.
- Use masked normalized correlation with a coarse-to-fine search. RGB agreement is secondary and is scored
  only where both frames are opaque.
- Emit per-frame `offsets` in rendered world pixels.
- Record confidence, overlap size, and residual displacement for every frame.
- Reject or flag low-confidence frames instead of silently writing offsets.

## Stage 2: Execution Registration

- Render the reference provider at 1280x720 for the declared scene-state fixture.
- Render the stabilized action reference frame offscreen.
- Match only declared scene-marker pixels retained in the generated animation. For `opens_window`, these are
  the minimal window-frame pixels deliberately kept in the otherwise transparent animation.
- Search scale first, then X/Y translation, and refine around the best result.
- Emit `scale`, `offsetX`, and `offsetY` separately from per-frame stabilization.
- A state fixture can change `referencePath` without changing the registration algorithm.

## Verification Gates

The real canvas renderer must capture:

- the reference scene-state immediately before execution;
- every action frame at its actual execution position;
- entry and exit transition frames;
- overlay and absolute-difference diagnostics.

A fit report records scale, translation, per-frame offsets, confidence, alpha overlap, residual jitter, and
the exact fixture/configuration used. Tests should fail when metadata is missing, frame counts drift, offsets
are non-finite, or residual registration error exceeds the approved threshold.

## Transparency Quality

Generated animations should contain only the character and the minimum scene marker required for fitting.
The importer reports opaque pixels outside the character and declared marker ROIs. Those pixels do not
participate in fitting and should be reviewed because they can cover runtime scene art.
