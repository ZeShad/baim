# Daily Learning Log

## 2026-08-04

### Learned

- Installed Node.js.
- Installed Codex CLI.
- Logged into Codex.
- Learned how Codex approvals work.
- Successfully launched the BAIM project.
- Fixed missing animation assets.
- Learned the responsibility of every major engine file.

### Biggest insight

Game.js coordinates the game.
The other files are specialized systems.

### Next topic

Understand how Game.js processes a mouse click and moves Bai Mitko.

---

## 2026-08-07

### Learned

- Created the `docs/developer-handbook` Git branch.
- Learned the difference between the working directory, staging area, commits, branches, pushes, and merges.
- Learned how `git status`, `git diff`, `git restore`, `git switch`, `git add`, `git commit`, and `git log` are used.
- Created the first Developer Handbook commit.
- Published the `docs/developer-handbook` branch to GitHub.
- Learned that `origin` refers to the remote GitHub repository connected to the local repository.
- Enabled periodic `git fetch` in VS Code so remote changes can be detected without modifying local files.
- Created and refined `PERSONAL_RULES.md` to define how AI assistants should collaborate with the project owner.
- Updated `AGENTS.md` so AI assistants also read `PERSONAL_RULES.md`.
- Created `00_START_SESSION.md` as the startup checklist for every Codex session.
- Added the Daily Learning Log to the Codex startup workflow.
- Created a reusable Codex prompt library under `docs/Prompts/`.
- Learned how different development tasks benefit from different AI workflows instead of using one generic prompt.

### Prompt Library Created

- `01_New_Feature.md`
- `02_Bug_Fix.md`
- `03_Code_Review.md`
- `04_Refactor.md`
- `05_Explain_File.md`
- `06_Documentation.md`

### Git Commits Created

- `Add Developer Handbook foundation`
- `Add startup workflow and collaboration guidelines`
- `Add Codex prompt library and improve session startup`

### Biggest Insight

Git is not just a backup system.

A branch allows work to develop separately from `master`, commits create meaningful checkpoints, and a Pull Request provides a review step before changes become part of the main project.

The AI workflow now has separate responsibilities:

- `AGENTS.md` = project rules.
- `PERSONAL_RULES.md` = collaboration rules.
- `00_START_SESSION.md` = session startup procedure.
- `13_Daily_Learning_Log.md` = continuity between sessions.
- `docs/Prompts/` = reusable task-specific AI workflows.

### Current Project State

- The BAIM project runs locally.
- Bai Mitko's missing runtime animation assets were rebuilt successfully.
- Automated tests previously reported 95 passed and 0 failed.
- The Developer Handbook work is on the `docs/developer-handbook` branch.
- The branch has been published and synced with GitHub.
- `master` has not yet been changed by this documentation work.

### Completed Since the Earlier Update

- Created the first Pull Request from `docs/developer-handbook` into `master`.
- Verified that the Pull Request targeted the user's own repository:
  - base repository: `ZeShad/baim`
  - base branch: `master`
  - compare branch: `docs/developer-handbook`
- Reviewed the Pull Request before merging.
- Merged Pull Request #1 into `master`.
- Switched the local repository back to `master`.
- Used `git pull` to synchronize local `master` with `origin/master`.
- Verified:
  - local branch was `master`
  - `master` was up to date with `origin/master`
  - working tree was clean.

### Developer Handbook Expansion

Created a new branch:

`docs/handbook-content`

Completed the four core Developer Handbook chapters:

- `00_Project_Overview.md`
  - project purpose
  - Chapter 1 scope
  - design principles
  - visual direction
  - gameplay overview
  - current project state
  - high-level architecture

- `01_Project_Structure.md`
  - repository structure
  - `src/engine/` vs `src/content/`
  - runtime assets vs source assets
  - tools
  - tests
  - generated output
  - important root files
  - guidance for where new files belong

- `02_Engine_Overview.md`
  - `Game.js` as coordinator
  - runtime input flow
  - movement
  - game loop
  - rendering
  - animation
  - asset loading
  - dialogue
  - inventory
  - quests
  - localization
  - save/load
  - stable IDs
  - geometry
  - hotspots
  - exits
  - anchors
  - scene editor
  - debugging flows
  - engine boundaries
  - data-driven architecture

- `03_File_Cheat_Sheet.md`
  - quick engine-file reference
  - responsibility map
  - debugging starting points
  - "where should I make this change?" guide
  - pre-edit checklist
  - fast mental model

### Git Work Completed

Staged only the four handbook chapters.

Created commit:

`4909de0 Add core Developer Handbook chapters`

The commit contained:

- 4 changed files
- 4,324 additions

Published the branch with:

`git push -u origin docs/handbook-content`

Created Pull Request #2:

`Add core Developer Handbook chapters`

Verified before merging:

- base: `master`
- compare: `docs/handbook-content`
- 1 commit
- 4 changed files
- 4,324 additions
- 0 deletions
- no merge conflicts

Merged Pull Request #2 into `master`.

Then:

- switched local repository back to `master`
- pulled the merged changes
- verified local `master` matched `origin/master`
- verified the working tree was clean

Created a new branch for this learning-log update:

`docs/update-learning-log`

### Git Concepts Reinforced Today

The complete branch workflow is now much clearer:

```text
master
    ↓
create new branch
    ↓
make changes
    ↓
git status
    ↓
git add
    ↓
git commit
    ↓
git push
    ↓
Pull Request
    ↓
review
    ↓
merge
    ↓
switch back to master
    ↓
git pull
    ↓
verify clean synchronized state
```

Important lessons:

- A branch allows work to remain separate from `master`.
- `git add` chooses exactly what will enter the next commit.
- A commit is a local checkpoint.
- `git push` publishes commits but does not merge them into `master`.
- A Pull Request provides a review step before merging.
- After merging on GitHub, local `master` must still be synchronized with `git pull`.
- `git status` is an important safety check before and after Git operations.
- Explicit file paths in `git add` are safer than staging everything blindly.
- GitHub's compare page should always be checked carefully to make sure the correct repository and branches are selected.

### Biggest Insight

A professional Git workflow is not just:

```text
save → upload
```

It is:

```text
isolate work
    ↓
review what changed
    ↓
create a checkpoint
    ↓
publish safely
    ↓
review again
    ↓
merge intentionally
    ↓
synchronize local state
```

The branch and Pull Request workflow gives several opportunities to catch mistakes before they reach `master`.

### Current Project State

- BAIM launches locally.
- Bai Mitko's runtime animation assets have been rebuilt successfully.
- The previous automated test run reported 95 passed and 0 failed.
- The Codex collaboration workflow is documented.
- The prompt library is in place.
- The first documentation foundation Pull Request has been merged.
- The four core Developer Handbook chapters are now complete and merged into `master`.
- Local `master` is synchronized with GitHub.
- The current working branch is `docs/update-learning-log`.

### Developer Handbook Current State

Completed:

- `00_Project_Overview.md`
- `01_Project_Structure.md`
- `02_Engine_Overview.md`
- `03_File_Cheat_Sheet.md`
- `PERSONAL_RULES.md`
- `13_Daily_Learning_Log.md` is actively maintained
- `Glossary.md` exists
- reusable prompt library exists under `docs/Prompts/`

The Developer Handbook now has a real foundation rather than only placeholder chapters.

### Still Pending

- Commit and publish this Daily Learning Log update.
- Decide whether to expand the Developer Handbook further.
- Continue improving the glossary as new concepts are learned.
- Return to actual Comrade Candidate gameplay development.
- Continue learning `Game.js` and the runtime input/movement flow in real code.
- Design the Telegram/Codex reporting and approval workflow separately and securely.

### Next Topic

After finishing this learning-log update:

1. Commit and push the log update.
2. Merge it into `master`.
3. Decide between:
   - continuing the Developer Handbook,
   - returning to gameplay development,
   - or examining `Game.js` in detail using `05_Explain_File.md`.

The next technical learning topic remains:

> Follow one real player click through `Game.js` and understand how it becomes Bai Mitko's movement or interaction.