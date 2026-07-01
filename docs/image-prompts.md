# Image Generation Prompt Recipes

Use these as starting prompts. Keep scene IDs and asset IDs unchanged.

## Global Style Frame

```text
Use case: stylized-concept
Asset type: visual style key art for a 2D point-and-click adventure game
Primary request: establish the visual style for "Другарят Кандидат / Comrade Candidate", a Balkan political satire adventure set in a modern Bulgarian provincial town
Scene/backdrop: dusty municipal square with patched asphalt, layered campaign posters, kiosk, old panel blocks, half-renovated public works, broken fountain, late afternoon light
Subject: Bai Mitko Petkov, broke middle-aged former accordion player turned municipal candidate, charming and shameless
Style/medium: high-resolution hand-painted 2D adventure game art, expressive caricature, modern painterly finish, strong silhouettes, 90s LucasArts staging without pixel art
Composition/framing: wide cinematic 16:9 point-and-click adventure background composition, clear walkable lower area, readable exits and props
Lighting/mood: warm dusty Balkan afternoon, comic melancholy, sharp satire but lovable
Color palette: sun-faded concrete, municipal beige, red-green poster accents, dusty blue shadows, not monochrome
Constraints: fictional politics only, no real party logos, no real politician likenesses, no UI, no watermark
```

## Bai Mitko Model Sheet

```text
Use case: illustration-story
Asset type: character model sheet for 2D adventure game animation
Primary request: Bai Mitko Petkov / Бай Митко Петков, broke middle-aged Bulgarian former accordion player entering local politics
Subject: stocky but wiry man in his 50s, tired eyes, expressive eyebrows, cheap tracksuit jacket over old shirt, worn shoes, slightly theatrical posture, carries accordion energy even when not holding it
Style/medium: clean high-resolution hand-painted animation model sheet, expressive LucasArts-inspired caricature, modern polished 2D
Composition/framing: front view, 3/4 view, side view, back view, plus 6 head expressions; neutral pose; full body visible
Materials/textures: cheap synthetic tracksuit, dusty shoes, stubble, weathered skin, slightly greasy hair
Constraints: plain light background, no shadows baked under feet, no text except small labels if necessary, no watermark
Avoid: real politician likeness, superhero body, medieval clothing, low-resolution pixel art
```

## Bai Mitko East Walk Pose Source

Use this only after loading the approved runtime source image:

- Primary image/reference: `assets_src/characters/bai-mitko-idle-east-chroma-v1.png`
- Secondary image/reference: `assets_src/characters/bai-mitko-model-sheet-v1.png`

```text
Use case: illustration-story
Asset type: source character cutout for green-screen removal, single east-walk key pose
Primary request: Edit/derive from the approved east idle green source image. Keep the same Bai
Mitko character, same portrait canvas family, same green background, same painterly rendering, same
lighting, same line weight, same face construction, same outfit details, same scale, and same
framing. Change only the pose into one east-facing walking key pose for later animation work.
Input images: Image 1 is the primary runtime style and identity anchor. Image 2 is secondary model
sheet authority for approved design only.
Pose: east/right walking key pose, one leg forward and one leg back, opposite arm swing, readable
side-walk silhouette, torso still recognizably Bai Mitko. Keep head/face friendly and matching Image
1.
Composition/framing: match Image 1's portrait source canvas exactly: `1023x1537` proportions,
full-body Bai Mitko at the same apparent height, same head size, same baseline/feet zone, same
center of mass, and same green padding logic. Do not switch to a landscape canvas.
Background: preserve the same flat green source-background treatment as Image 1. No transparency,
no checkerboard, no scenery, no shadow, no text.
Constraints: do not redesign the face, body proportions, jacket, shirt, pants, shoes, moustache,
hair, rendering style, brush density, line weight, canvas ratio, or framing. Do not generate a fresh
standalone interpretation.
Reject if: the result looks from a different generation batch than Image 1, uses landscape
proportions, changes the source canvas ratio, or changes Bai Mitko's apparent scale.
```

## Village Square Background

```text
Use case: illustration-story
Asset type: production concept for scene.chapter1.village_square
Primary request: modern Bulgarian village/town square for a political satire point-and-click adventure
Scene/backdrop: cracked socialist pavement, broken fountain, forgotten local hero statue, dusty bus stop, kiosk, old men bench, entrance to mehana, entrance to municipality, panel blocks in background
Style/medium: high-resolution hand-painted 2D adventure game background, painterly but readable, expressive shapes, Full Throttle / Day of the Tentacle staging at modern resolution
Composition/framing: 16:9 fixed camera, clear walkable area in lower half, exits readable, props separated for hotspots, no characters baked in
Lighting/mood: dry afternoon light, absurd municipal optimism, comic decay
Text (verbatim): "ГЛАСУВАЙ ЗА МИТКО: ПОНЕ ГО ПОЗНАВАШ", "РЕМОНТ НА РЕМОНТА — ФАЗА 3"
Constraints: Bulgarian signs allowed, no UI, no real party logos, no real politician faces, no watermark
```

## Mehana Background

```text
Use case: illustration-story
Asset type: production concept for scene.chapter1.mehana
Primary request: interior of Mehana "The Two Goats", a smoky modern Bulgarian tavern for a satire adventure game
Scene/backdrop: smoke-yellowed walls, plastic tablecloths, rakia bottles, kebapche grill, old chalga radio, 2007 calendar, framed goat photo with mayoral sash, water jug, receipt box, back door
Style/medium: high-resolution hand-painted 2D adventure game background, expressive caricature proportions, painterly texture, readable props
Composition/framing: 16:9 fixed point-and-click camera, Tony's table on right, bar/grill mid scene, clear walkable lower area, foreground table layer possible
Lighting/mood: warm smoky interior, funny but slightly dangerous
Constraints: no characters baked in, no UI, no real brands, no watermark
```
