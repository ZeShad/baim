# HTML HUD And Inventory

The 1280x720 canvas renders the game world only. Persistent controls, status meters, the selected verb,
and inventory belong in `#ui-root` as HTML/CSS. Do not add a painted HUD strip in `Renderer` because it
is rasterized into the world canvas and makes high-resolution item art harder to read on large displays.

## Inventory Contract

- Item identity and localized name/description remain in `src/content/chapter1/items.js` and localization.
- Runtime icon paths remain in `src/content/art/assetManifest.js`.
- `AssetLoader.preloadAllItemAssets()` completes before gameplay input is enabled.
- Inventory displays the original raster asset through an `<img>` with `object-fit: contain`; do not create
  a low-resolution canvas thumbnail.
- The resting item target is 78x78 virtual CSS pixels. Hover or keyboard focus magnifies the item and its
  immediate neighbors without changing document layout.
- Names stay out of the resting dock and appear as localized tooltips on hover or focus. Each item button
  keeps an accessible name and tooltip relationship.
- Left and right arrows move focus within the horizontal inventory toolbar. Home and End move to its bounds.
- Clicking an item inspects it by speaking its localized description.
- Reduced-motion preferences disable dock movement while preserving focus and tooltip feedback.

## Adding An Item Icon

1. Add the stable item definition and Bulgarian/English strings.
2. Add the high-resolution transparent icon under `assets/chapter1/items/`.
3. Add the icon path under the same stable item ID in `assetManifest.items`.
4. Run `npm test` and inspect the dock at 1x and 2x browser scale.

