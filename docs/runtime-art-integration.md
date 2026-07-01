# Runtime Art Integration

## Current Visual State

The game starts normally in:

```text
scene.chapter1.apartment
```

That scene now has the first real apartment runtime background.

The village square background is also integrated and proves runtime background loading works, but it is not final locked art direction. Its layout is useful, but the final version should later be regenerated or repainted closer to the Bai Mitko model-sheet style, with less baked-in readable text and more replaceable poster/sign surfaces.

## Scene Background Status

| Scene ID | Runtime background | Status |
| --- | --- | --- |
| `scene.chapter1.apartment` | `assets/chapter1/scenes/apartment/background.png` | integrated |
| `scene.chapter1.village_square` | `assets/chapter1/scenes/village_square/background.png` | integrated; runtime proof, not final locked style |
| `scene.chapter1.mehana` | `assets/chapter1/scenes/mehana/background.png` | missing |
| `scene.chapter1.municipality` | `assets/chapter1/scenes/municipality/background.png` | missing/not implemented |
| `scene.chapter1.election_booth` | `assets/chapter1/scenes/election_booth/background.png` | missing/not implemented |

## Apartment Runtime Target

Source image:

```text
assets_src/environments/apartment-approved-style-v1.png
```

Runtime asset:

```text
assets/chapter1/scenes/apartment/background.png
```

This is the first real background for the default start scene. It is closer to the Bai Mitko model-sheet direction than the current village square proof, but still should be treated as a first runtime pass rather than final locked art.

## Village Square Runtime Target

Approved source image:

```text
assets_src/environments/village-square-approved-style-v1.png
```

This was preserved from:

```text
assets_src/environments/village-square-concept-v2.png
```

Older concept images were not deleted.

Runtime asset:

```text
assets/chapter1/scenes/village_square/background.png
```

PNG is temporary. WebP is still preferred for final runtime delivery, but no WebP conversion tool is currently available in the project tooling.

## Character Runtime Sprite

Integrated static idle sprite:

```text
assets/chapter1/characters/bai_mitko/idle.png
```

The idle sprite replaces the geometric placeholder when loaded. If it is missing, the renderer falls back to the geometric Bai Mitko placeholder.

The model sheet remains source direction:

```text
assets_src/characters/bai-mitko-model-sheet-v1.png
```

Next character-art task:

```text
Bai Mitko idle + walk runtime sprite/atlas pass
```

The current `idle.png` can be reused as the idle key pose or replaced by a cleaner animation-ready cutout.

## Starting Inventory Icons

Integrated runtime icons:

```text
assets/chapter1/items/accordion.png
assets/chapter1/items/unpaid_bills.png
assets/chapter1/items/empty_envelope.png
```

If an icon is missing, the inventory UI keeps the existing text-label fallback box.

## Manifest Entries

The active apartment manifest entry is:

```js
"scene.chapter1.apartment": {
  background: "assets/chapter1/scenes/apartment/background.png",
  foreground: "assets/chapter1/scenes/apartment/foreground.webp",
  geometry: "assets/chapter1/scenes/apartment/scene.geometry.json"
}
```

The active village square manifest entry is:

```js
"scene.chapter1.village_square": {
  background: "assets/chapter1/scenes/village_square/background.png",
  foreground: "assets/chapter1/scenes/village_square/foreground.webp",
  geometry: "assets/chapter1/scenes/village_square/scene.geometry.json"
}
```

The renderer resolves these paths relative to `index.html`.

## Renderer Behavior

Normal gameplay:

- attempts to load the scene background from `assetManifest`
- draws the real background if it loads
- hides hotspot/walk/debug boxes by default on real backgrounds
- draws Bai Mitko's idle sprite if it loads
- draws starting inventory icons if they load

Fallback behavior:

- if a scene background is missing, still loading, or fails to load, the renderer draws the placeholder background
- geometry boxes are shown on fallback placeholders so missing-art scenes remain debuggable
- if Bai Mitko's idle sprite is missing, the geometric player placeholder is drawn
- if an inventory icon is missing, the text-only inventory box remains usable

Debug overlay:

- press `Shift+G` to toggle scene geometry debug overlay
- open the game with `?debugGeometry=1` to enable it immediately
- debug geometry is off by default on normal reloads

When enabled, the overlay may draw:

- walk polygon
- depth zones
- exits
- hotspot rectangles
- NPC rectangles
- anchors

## Developer Diagnostics

Art-load diagnostics are console-only and gated behind debug geometry mode.

Enable diagnostics with either:

```text
http://localhost:5173/?debugGeometry=1
```

or press:

```text
Shift+G
```

Expected examples:

```text
[art] scene.chapter1.apartment background: loaded assets/chapter1/scenes/apartment/background.png
[art] scene.chapter1.village_square background: loaded assets/chapter1/scenes/village_square/background.png
```

Diagnostics log only when scene/art status changes. They should not spam every frame.

## Direct Scene Verification

For development/testing only, use:

```text
http://localhost:5173/?scene=scene.chapter1.village_square
```

This starts directly in the village square if the scene ID exists.

Rules:

- normal default start scene is unchanged
- save loading still works
- invalid scene IDs are ignored safely
- the query param does not create a new chapter or change stable IDs

Useful combined URL:

```text
http://localhost:5173/?scene=scene.chapter1.village_square&debugGeometry=1
```

## Alignment

Apartment roughly aligned in logical `1280x720` scene coordinates:

- walk polygon
- Bai Mitko spawn point
- door exit to village square
- accordion hotspot
- unpaid bills hotspot
- mirror hotspot
- TV hotspot
- wardrobe hotspot
- table hotspot
- campaign poster hotspot

Village square roughly aligned in logical `1280x720` scene coordinates:

- walk polygon
- apartment exit
- mehana exit
- municipality entrance area
- kiosk hotspot
- campaign board hotspot
- fountain hotspot
- statue hotspot
- old men bench hotspot
- election notice hotspot
- Baba Stoyanka anchor/interaction area
- Journalist anchor
- Old Men Chorus anchor
- Bai Mitko default spawn point

## Manual Alignment Still Needed

- Fine hotspot tuning should be done with `Shift+G` in browser.
- Apartment foreground occlusion is not split yet; later split objects such as the table/chairs, accordion chair, and door frame if needed.
- The municipality entrance geometry exists, but `scene.chapter1.municipality` is not implemented in the current runtime scene list yet. Clicking it is safely guarded and shows a not-ready message.
- Village square foreground occlusion is not split yet. Later, export foreground elements such as the mehana doorway, kiosk edge, fountain rim, and foreground plants as separate layers if needed.
- Topical poster text should eventually be moved to replaceable layers where possible.
