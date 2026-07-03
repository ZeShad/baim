# Raster Scene Runtime

The production runtime uses raster scene data for movement and occlusion. Polygon geometry can remain
as authoring/debug context, but Bai Mitko navigation and foreground occlusion should be raster-driven.

## Layer Order

Scene drawing uses one shared depth scale:

- `0` = frontmost, closest to the camera.
- `100` = horizon/back.
- Bai Mitko gets a runtime z index from his feet position: horizon maps to `100`, bottom/front maps to
  `0`.
- Scene foreground/background cutout layers define explicit real-number `zIndex` values.
- The renderer draws larger z values first and smaller z values later, so lower values appear in front.

Example:

```js
foregroundLayers: [
  {
    id: "layer.apartment.table_foreground",
    asset: "foregroundTable",
    zIndex: -1
  }
]
```

## Foreground Layer Assets

Foreground occlusion is a manually authored raster asset problem, not a runtime polygon problem.

For each extracted layer:

1. Keep the original approved background under `assets/chapter1/scenes/<scene>/background.png`.
2. Manually create and approve the foreground alpha PNG for the object or prop.
3. Register the output asset in `assets_src/chapter1/scenes/<scene>/layers.json`.
4. Register the runtime asset key in `src/content/art/assetManifest.js`.
5. Add the scene layer entry with its numeric `zIndex`.

If a manual black/white mask is provided, `node tools/build-scene-layers.js` can copy original
background pixels through that mask into an alpha PNG under `assets/`. The build step must stay
deterministic and must not invent or regenerate masks.

## Walk Routing

Every production scene should use a low-resolution raster `walkMask`.

- Walkable cells are authored as mask values such as `c` or `e`.
- Blocked cells are `.`.
- Clicking a walkable point routes through the mask grid with A*.
- The result is smoothed by line-of-sight checks through the same mask.
- Object interactions first resolve the closest hand/feet approach point, then route to that point
  through the raster mask.

This gives adventure-game behavior: Bai Mitko walks around blocked floor regions instead of moving in
a straight line through furniture or foreground props.
