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

### Still Pending

- Create the first Pull Request from `docs/developer-handbook` into `master`.
- Review the Pull Request before merging.
- Merge the documentation branch into `master`.
- Switch the local repository back to `master` and synchronize it.
- Continue expanding the Developer Handbook.
- Return to actual Comrade Candidate game development.
- Design the Telegram reporting and approval workflow separately.

### Next Topic

Create and review the first GitHub Pull Request from:

`docs/developer-handbook`

into:

`master`