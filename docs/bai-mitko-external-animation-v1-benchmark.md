# Bai Mitko External Animation v1 Benchmark

## Status

External Animation v1 is the active Bai Mitko animation import path.

Status: review required.

Active scope: EAST walk start/loop/stop and mirrored WEST only.

Deferred: north, south, diagonals, run.

## Input ZIPs

```text
C:\t\test\bai-mitko-walk-east-start.zip
C:\t\test\bai-mitko-walk-east-loop.zip
C:\t\test\bai-mitko-walk-east-stop.zip
```

Copied to:

```text
assets_src/characters/bai_mitko/external_animation_v1/input/
```

## Metadata Rule

Use the Ludo JSON metadata as source of truth for frame rectangles, frame order, frame count, frame timing/FPS when present, and sprite sheet references. Grid slicing is only a fallback if metadata is missing or unusable.

Pipeline order:

1. unpack the ZIPs
2. inspect JSON metadata
3. run robust chroma-key / despill cleanup into derived `target/` sheets
4. copy the cleaned derived sheet per animation for game-facing runtime use
5. preserve JSON frame order and frame rectangles in generated metadata
6. draw the current source rectangle at runtime with mirror/scale transforms

There is no persistent extracted-frame or normalized-frame folder in the active path. Preview generation may crop temporary frames from JSON rectangles, but those temporary files are deleted after preview output.

## Chroma-key / green spill cleanup

Some Ludo source assets can contain green spill around hair, outlines, shoes, and semi-transparent edges. The active cleanup step preserves the original ZIPs and unpacked source sheets, then writes cleaned derived sheets under:

```text
target/external_animation_v1/cleaned/
target/external_animation_v1/cleaned_frames/
target/external_animation_v1/chroma_previews/
target/external_animation_v1/reports/chroma-cleanup-report.json
```

Cleanup uses:

- soft green-dominance matte, not exact-pixel removal
- connected-background detection from image borders
- neighborhood matte filtering
- optional erosion and feathering
- edge-focused green despill
- straight RGBA PNG output

Default review command:

```bash
node tools/clean-green-screen-assets.js --key=auto --low=12 --high=55 --matteFilter=median3 --erode=1 --feather=1 --despill=0.75 --connectedBackground=true
```

If hair, black outlines, or shoes look damaged, tune `--low`, `--high`, `--erode`, `--feather`, and `--despill`. Runtime staging and previews prefer the cleaned derived sheets when they exist.

## Unpacked Paths

```text
target/external_animation_v1/unpacked/walk_east_start/
target/external_animation_v1/unpacked/walk_east_loop/
target/external_animation_v1/unpacked/walk_east_stop/
```

## Metadata Inspection Summary

- `walk_east_start`: metadata mode, 9 frames, 480x864 frame size, alpha present.
- `walk_east_loop`: metadata mode, 16 frames, 480x864 frame size, alpha present.
- `walk_east_stop`: metadata mode, 9 frames, 480x864 frame size, alpha present.

Report:

```text
target/external_animation_v1/reports/metadata-inspection-report.json
```

## Runtime Sheet Summary

The current runtime review uses one cleaned sheet per animation and JSON frame rectangles:

- `walk_east_start`: 9 frames, 480x864 frame rects, 1440x2592 sheet.
- `walk_east_loop`: 16 frames, 480x864 frame rects, 1920x3456 sheet.
- `walk_east_stop`: 9 frames, 480x864 frame rects, 1440x2592 sheet.

## Preview Paths

```text
target/external_animation_v1/previews/walk_east_start.gif
target/external_animation_v1/previews/walk_east_start_contact_sheet.png
target/external_animation_v1/previews/walk_east_loop.gif
target/external_animation_v1/previews/walk_east_loop_contact_sheet.png
target/external_animation_v1/previews/walk_east_stop.gif
target/external_animation_v1/previews/walk_east_stop_contact_sheet.png
target/external_animation_v1/previews/walk_east_full_sequence.gif
target/external_animation_v1/previews/walk_east_full_sequence_contact_sheet.png
target/external_animation_v1/previews/walk_west_FULL_MIRRORED_FROM_EAST.gif
```

## Runtime Staging Paths

Game-facing review sheets:

```text
target/external_animation_v1/runtime/walk_east_start.png
target/external_animation_v1/runtime/walk_east_loop.png
target/external_animation_v1/runtime/walk_east_stop.png
```

## Runtime Concept

East:

```text
idle_east -> walk_east_start once -> walk_east_loop repeated while moving -> walk_east_stop once -> idle_east
```

West:

```text
idle_west -> mirrored walk_east_start once -> mirrored walk_east_loop repeated while moving -> mirrored walk_east_stop once -> idle_west
```

North/south and diagonals are intentionally deferred and safely fall back.

## Test URLs

AnimLab:

```text
http://localhost:5173/?animLab=1
```

In-game review variant:

```text
http://localhost:5173/?play=1&characterVariant=external_animation_v1
```

Debug animation:

```text
http://localhost:5173/?play=1&characterVariant=external_animation_v1&debugAnimation=1
```

## Acceptance Criteria

- east start transitions from idle into loop
- east loop repeats cleanly
- east stop transitions back to idle
- west mirrors east cleanly
- no severe jitter
- no broken alpha/background
- no severe scale popping
- works at game scale
- visually better than previous rejected rig/layer/direct-generation attempts

## Commands

```bash
node tools/copy-external-animation-inputs.js
node tools/unpack-external-animation-zips.js
node tools/inspect-external-animation-metadata.js
node tools/clean-green-screen-assets.js --key=auto --low=12 --high=55 --matteFilter=median3 --erode=1 --feather=1 --despill=0.75 --connectedBackground=true
node tools/preview-external-animations.js
node tools/build-external-runtime-staging.js
```
