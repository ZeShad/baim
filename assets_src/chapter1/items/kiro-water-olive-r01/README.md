# Fountain water: lower shoulder and muddy olive/brown

Visual acceptance recorded: owner accepted this candidate on 20 October 2026 ("yes looks good"). Publication follows a separate exact approval and release-verification workflow.

The original `kiro-water-c07` source, all original GLBs and native files remain unchanged. `derive-water.cjs` appends a clipped liquid primitive and texture to C07 while retaining every original binary byte, cap, glass, label, node and transform. It intersects the existing liquid at Y=.153m and closes the cut with an upward horizontal surface. No bottle scaling or overlay. The original .166768m surface is higher than the owner's new shoulder mark.

The new fine-silt texture uses olive/brown91/76/29 sRGB as a starting material, visually compared with actual fountain art through the normal viewer. This is not a promise of identical screenshot RGB through glass and different lighting. The original material alpha and shared viewer optics remain intact.

`render-fallback.py` derives a packed native source from the original C07 blend, cuts only the water at Z=.153m and renders the r02 fallback/icon. Its liquid shading uses the shared viewer's opaque real-time presentation and roughness. Label/glass/cap/camera remain original. The superseded r01 native source/render are retained but unused. `provenance.json` binds final files.

Runtime: `fountain-water-olive-r01.glb` with `liquidColor:null`, and `fountain-water-olive-r02.png`. Oil and empty states use their original assets. Both statue and basin refill rules still create the same stable water item after repair; oil use remains statue-only.

Owner references and full normal BG/EN verification live in the dedicated workspace evidence directory `extraFixes/bottle-arrival-water-20261020/`; current-status.md is the one current action. No paid generation, animation replacement, fountain-art change or publication authority.
