# Runtime Art Coverage

## Current Diagnosis

- Apartment background: integrated as first real default-start background.
- Village square background: integrated, technical proof works.
- Village square art direction: usable for layout/runtime proof, but still too realistic and text-heavy for final style.
- Bai Mitko model sheet: locked identity source.
- Bai Mitko runtime animation: current source-art direction is model-sheet-preserving east walk
  only, with west mirrored from east. North/south walk, talk/look/use/take remain placeholders or
  deferred.
- Inventory icons: starting inventory icons integrated for accordion, unpaid bills, and empty envelope.
- UI skin: prototype.
- Debug geometry: should remain hidden unless `Shift+G` or `?debugGeometry=1` is enabled.

## Direction Lock

The next runtime art should move closer to the approved Bai Mitko model sheet:

- fresh 1990s cartoon adventure feel
- bold ink outlines
- warped cartoon shapes
- readable gameplay silhouettes
- less realistic rendering
- less baked-in readable text

The current village square stays as a runtime proof and layout reference, not final locked art direction.

## Current Integrated Runtime Assets

- `assets/chapter1/scenes/apartment/background.png`
- `assets/chapter1/scenes/village_square/background.png`
- `assets/chapter1/characters/bai_mitko/idle.png`
- `assets/chapter1/items/accordion.png`
- `assets/chapter1/items/unpaid_bills.png`
- `assets/chapter1/items/empty_envelope.png`

## Remaining Placeholders

- Bai Mitko talk/look/use/take animations
- Mehana background
- Municipality background and scene implementation
- Election booth background and scene implementation
- UI skin
- Remaining inventory item icons
