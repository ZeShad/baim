# Stateful 1:1 Scene Layer Workflow

Use a stateful scene layer when an interaction permanently changes part of a painted scene, but the
replacement art should remain a transparent, pixel-aligned overlay rather than a new full background.

The Chapter 1 open window uses this workflow. The existing table and bills overlays use the same scene-layer
renderer without a visibility condition.

## Art Contract

- Export a transparent PNG at runtime pixel scale. Scene layers are always rendered 1:1 and are not scaled.
- Keep only the pixels needed to replace or cover the changed scene area.
- Place the PNG against the 1280x720 runtime background and record its exact integer `left` and `top`.
- Automated masked template matching may recover an initial placement, but the production composite remains
  the visual acceptance artifact.
- Put the runtime PNG under `assets/<chapter>/scenes/<scene>/`.

For `layer.apartment.window_open`, the 307x307 PNG matches at `left: 150`, `top: 51`.

## Data Contract

1. Add a stable asset slot to `src/content/art/assetManifest.js`.
2. Add a stable layer entry to the scene's `assets_src/.../layers.json`:

```json
{
  "id": "layer.apartment.window_open",
  "enabled": true,
  "asset": "windowOpen",
  "output": "assets/chapter1/scenes/apartment/window-open.png",
  "zIndex": 100,
  "top": 51,
  "left": 150,
  "visibleWhenFlag": "apartmentWindowOpen"
}
```

`zIndex: 100` is the scene horizon: the layer draws immediately in front of the background and behind actors
with a lower depth value. Omit `visibleWhenFlag` for an always-visible layer.

3. Add `flagOnComplete` to the gameplay action sequence that reveals the layer:

```js
{
  animation: "opensWindow",
  flagOnComplete: "apartmentWindowOpen"
}
```

The engine sets `state.flags[flagOnComplete]` only after the action animation finishes, then saves. Reloading
an existing save therefore restores the changed scene appearance.

## Build And Verify

```powershell
node tools/build-scene-layer-runtime.js
npm test
```

Verify both states in the real scene:

1. Start with `flags.apartmentWindowOpen` absent: the overlay must not draw.
2. Execute the open-window action: the overlay must remain hidden during the animation.
3. On the final animation frame, the overlay becomes visible without scaling or position change.
4. Reload the game: the overlay remains visible from saved state.

Tests must cover the stable layer ID, asset slot, exact 1:1 position, depth, visibility flag, hidden/visible
filtering, action completion, and save call.
