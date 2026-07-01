# Animation Direction

## Animation Target

Animation should be:

- springy
- pose-driven
- expressive
- comedic
- readable
- slightly overacted
- silhouette-clear
- character-specific

Do not aim for realism-first animation.
Do not rely on subtle tweening only.
The motion must feel alive and cartoony.

Use:

- squash and stretch
- anticipation
- overshoot
- expressive holds
- strong key poses
- readable silhouettes
- clear mouth shapes
- character-specific body language

## Technical Direction

Current Bai Mitko production path:

- The approved model sheet is the locked identity source for all Bai Mitko animation work.
- Generate or edit pose/source frames from the model sheet with strict identity preservation.
- Use green-background source images and the green-removal pipeline for runtime cutouts.
- Current walk authoring scope is east/source only. Do not generate separate west walk images or
  west animation sources; west should mirror the approved east source at runtime or review time.
- External Ludo.ai sprite sheets and JSON metadata are deferred review material, not the current
  design authority, until the model-sheet-driven character variables are stable.
- North, south, diagonals, and run animations are not current priorities and remain deferred.
- Run animations are deferred until explicitly approved.

All animations must map to stable animation names. Do not change animation IDs casually once content uses them.

Core Bai Mitko animation names:

- `idle`
- `walk_down`
- `walk_up`
- `walk_side`
- `talk_neutral`
- `talk_smug`
- `look`
- `use`
- `take`
- `play_accordion`
- `drink`
- `react_shocked`

## Bai Mitko Animation Personality

### Idle

- Slight forward slouch.
- One shoulder lower than the other.
- Small tired bounce, like his knees are negotiating with gravity.
- Eyes scan for creditors.
- Fingers twitch like they remember accordion buttons.
- Occasionally adjusts cheap jacket or moustache.
- Should feel broke but not broken.

### Walk

- Quick survival shuffle.
- Feet slightly outward.
- Torso leans before legs commit.
- Arms swing with unnecessary explanation energy.
- Tiny stumble recovery every few loops.
- He moves like someone trying to look casual while leaving before the bill arrives.

### Talk

- Gesture-first speaker.
- Hands open in fake sincerity.
- Eyebrows do half the lying.
- Head tilts when improvising.
- Shoulders lift when he tries to sound official.
- Mouth shapes must be clear and funny.
- Talk loops should support short sharp lines, not long monologues.

### Use / Interaction

- Anticipation before touching anything questionable.
- Looks left and right before morally flexible actions.
- Uses two fingers for suspicious items.
- Overconfident flourish when a stamp, paper, or loophole is involved.
- Small recoil when the object is worse than expected.

### Emotional Range

Bai Mitko must support:

- tired optimism
- shameless charm
- panic hidden behind a smile
- wounded pride
- sudden official confidence
- fake dignity
- practical cowardice
- accordion sadness
- tiny victory
- "this may be illegal but it has a process" certainty

## Major NPC Animation Examples

### Baba Stoyanka

Idle:

- Almost no body movement.
- She is the fixed point; the world moves around her.
- Slow blink, tiny head turn, hand gripping bag or cane.

Talk:

- Minimal but devastating gestures.
- One eyebrow can carry a whole accusation.
- Points with two fingers or a folded receipt.
- Holds silence after insults.

Reaction:

- Does not gasp.
- Narrows eyes.
- Slight lean forward means the player is in danger.

### Tony The Fridge

Idle:

- Heavy breathing, massive stillness.
- Fingers drum on table like falling furniture.
- Chest leads the pose.
- He occupies more emotional space than physical space.

Talk:

- Slow head turns.
- Short lines with heavy jaw movement.
- Laughs as a body event, not just a face.
- Sentimental moments soften the eyes while the body stays dangerous.

Reaction:

- Suspicion starts in the shoulders.
- Anger is a slow rise, not a snap.
- Respect lands as a heavy approving nod.

### Journalist

Idle:

- Alert, narrow, always recording mentally.
- Pen/camera/notebook ready.
- Weight forward.

Talk:

- Calm, precise mouth shapes.
- Small professional gestures.
- Head tilt when Bai Mitko contradicts himself.
- Does not overreact; restraint makes the comedy sharper.

Reaction:

- Raises eyebrow.
- Writes one word.
- Silence increases Suspicion more than shouting.

### Clerk

Idle:

- Stamp hand ready.
- Eyes half-lidded from years of forms.
- Small paper-aligning loops.

Talk:

- Robotic calm.
- Gestures only toward forms, counters, stamps, and forbidden doors.
- Mouth barely opens for devastating rules.

Reaction:

- Confusion becomes procedure.
- Any surprise is converted into paperwork.

## Animation Examples By Action

### Idle Loops

- 4-8 seconds before repeating obviously.
- Include one tiny character-specific habit.
- Avoid constant noisy motion.
- Keep silhouette readable.

### Walk Cycles

- Use the reviewed Ludo.ai frame count and metadata fps for the active Bai Mitko walks.
- Bai Mitko movement is frame-modulated so travel speed varies across the cycle instead of sliding at a perfectly constant rate.
- Walk must communicate personality, not just locomotion.
- Add direction variants only when needed for scene staging.

### Talk Loops

- 2-4 mouth poses minimum.
- Add eyebrow and hand accents.
- Separate neutral, smug, nervous, and angry talk loops for major characters.
- Use expressive holds after punchlines.

### Use Animations

- Short anticipation.
- Clear action pose.
- Small overshoot or recoil.
- Return to idle with attitude.

### Reaction Animations

- Big readable pose first.
- Hold the expression long enough for comedy.
- Settle back with a character-specific gesture.

## Scene Animation

Use small environmental loops:

- flickering fluorescent lights
- gently moving smoke
- buzzing TV glow
- lazy radio needle
- poster corner flapping
- broken fountain drip
- ticket machine blink
- stamp impact

Do not animate everything. Animated details should guide attention or add comedy.

## Scene Comedy Layering Through Motion

Every important scene should eventually have:

- one main animated visual joke
- two small looping prop animations
- one character idle behavior that sells the scene
- readable stillness around important hotspots

Examples:

- Apartment: TV flickers while the campaign poster peels with pride.
- Village Square: fountain coughs one drop every few seconds.
- Mehana: smoke curls around Tony's table like a warning label.
- Municipality: ticket machine blinks "wait" even when nobody is there.

## Production Do/Don't Checklist

Do:

- thumbnail-test every key pose
- exaggerate before polishing
- use anticipation and overshoot
- hold punchline poses
- make each NPC move differently
- keep feet readable during walks
- keep hands readable during interactions
- make talk gestures match line rhythm
- preserve silhouette clarity over smoothness
- export animation names matching the content contract

Don't:

- make motion realistic but bland
- rely only on subtle opacity/position tweens
- overanimate background clutter
- use generic walk cycles for major NPCs
- hide important gestures behind the UI
- bake shadows that fight scene lighting
- change animation IDs without approval
- polish in-betweens before key poses work
