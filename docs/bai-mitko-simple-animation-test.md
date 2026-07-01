# Bai Mitko Simple Animation Test

URL:

```text
http://localhost:5173/?simpleAnimTest=1
```

This is a dev-only page for testing the active `external_animation_v1` Ludo east/west animation without scene movement, mouse clicks, pathfinding, inventory, dialogue, hotspots, or exits.

## Buttons

- `Reset`: center Bai Mitko, face east, clear movement and transitions.
- `Idle East`: show the east idle pose.
- `Walk Right`: play `walk_east_start` once, then `walk_east_loop` while moving right.
- `Walk Left`: mirror the east start/loop/stop animations and move left.
- `Stop`: stop horizontal movement, play stop once, then idle in the current direction.
- `Play East Start`: play the start animation in place.
- `Play East Loop`: loop the walk animation in place.
- `Play East Stop`: play the stop animation in place.
- `Play Full East Sequence`: idle pause, start, loop three times, stop, idle.
- `Play Full West Sequence`: same sequence mirrored.

## Controls

- Movement speed slider: default `60 px/sec`.
- FPS override slider: `0` means use metadata FPS.
- Show bounds/baseline overlays: draws frame bounds, baseline, and source-rect info.

## What To Inspect

- Scale pop between idle, start, loop, and stop.
- Vertical jump at start-to-loop and stop-to-idle transitions.
- Foot sliding during loop movement.
- Stop transition timing and whether it snaps.
- West mirroring correctness.
- Frame stuck at `0`.
- Source rect changes frame by frame.
- Baseline and anchor stability.

Only east and mirrored west are active here. North, south, diagonals, run, and old rig/layer experiments are intentionally excluded.
