# Turning correction r03 — endpoint alignment

Owner reported an end jump after r02. Corrected locally, uncommitted/unpublished; owner visually approved exact r03 with “fine, approved” after the inline one-shot review. [Frozen r02 report](../../extraFixes/mitko-turning-pilot-20261016/runtime-r02-frozen/runtime-review.md). Source36-frame original/atlas and Hydra+ preference remain intact.

## Diagnosis and correction

Two discontinuities were separate: the focused r02 GIF restarted abruptly from pocket rest to the initial front pose; the actual turn20→pocket8 join had mismatched source registration, moving the lowest supporting boot about8.5pixels left/up. The last pocket frame→idle was already identical (same source15, draw rectangle, scale and registration). [Before/after native draw measurement](../../extraFixes/mitko-turning-pilot-20261016/contact-verification-r03.json).

R03 aligns pocket8's lowest boot contact once to the completed turn20's contact, using a constant anchor/baseline for the entire pocket segment and held rest. Both use the same426pixel visual registration height. Turn contact139.5,474; pocket contact183.363636,508 in exact half-resolution atlases (alpha>8, bottom two rows). Pocket baseline497, anchorX=(183.363636+4.5)/399. No per-frame translation, scaling, warping, repaint or crossfade. Actual body/hand/stance changes in the source remain; this corrects spatial registration, not the source's distinct poses.

Real rendered contact at the join is476.6026305,573.3046810 on both sides (floating-point residual x5.7e-14,y0). Logical feet remain480,565; the local boot position retains the completed pivot's native forward/support displacement. Final source15→idle draw x/y/width/height delta is exactly0. This is direct renderer measurement, not a natural-motion quality guarantee.

Speed unchanged: pivot0–20 at20fps1050ms, pocket8–15 at20fps400ms. One south→east/contact0 pilot only. Original36×76ms=2736ms; selected pivot native1596ms; full asset/source hashes unchanged. PR67 speed/ramp/exact arrival/priorities protected.

## Fresh verification and review

369/369 targeted tests, zero fail/cancel/skip, including fixed historical inverse chains, interrupted pocket reversal, missing art/priorities, and boot-contact registration equality. [Log](../../extraFixes/mitko-turning-pilot-20261016/targeted-r03-correction.log). Fresh normal5173 BG/EN capture binds served code/manifest: BG1049.8/416.5ms, EN1050/399.5ms for turn/pocket. All21turn indices, exact logical feet,1200ms idle hold, cancellation/newclick, pocket reversal, pause, scene, missing/late art, Baba priority and no console/network errors pass. [Results](../../extraFixes/mitko-turning-pilot-20261016/gameplay-2026-10-16T20-56-40.276Z/result.json). First capture attempt included the new1200ms review hold in the measured pocket duration and failed its harness assertion; retained under gameplay-2026-10-16T20-56-08.889Z. Harness now measures first idle tick; product timing unchanged.

[BG one-shot gameplay](../../extraFixes/mitko-turning-pilot-20261016/gameplay-2026-10-16T20-56-40.276Z/bg-turn-oneshot.gif), [EN one-shot](../../extraFixes/mitko-turning-pilot-20261016/gameplay-2026-10-16T20-56-40.276Z/en-turn-oneshot.gif), [join samples](../../extraFixes/mitko-turning-pilot-20261016/gameplay-2026-10-16T20-56-40.276Z/join-contact-sequence.png). Clips include real1200ms final idle hold, no GIF repeat extension and no test-fixture reset. Durations rounded to10ms GIF ticks. [Media receipt](../../extraFixes/mitko-turning-pilot-20261016/gameplay-2026-10-16T20-56-40.276Z/oneshot-media-receipt.json).

[Guarded r03 overlay](../../extraFixes/mitko-turning-pilot-20261016/preview-composition-r03.json) updates only controller/metadata, preserves other source/dirty paths, atlas/manifest and existing listener. Broader r01 image/quest/listening/speed checks are historical for unchanged bytes; not new r03 runs. Known nonadministrator symlink EPERM remains; no futile full run/skips. Renewed648test Administrator binding prepared; full suite, exact-head CI and postmerge gates pending. No paid generation/retry/publication/direction expansion/deletion.

Immediate next action: run frozen648test verification in an Administrator terminal. Runtime approval is recorded; separate publication scope remains unapproved.
