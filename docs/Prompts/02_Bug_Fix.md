# Bug Fix Request

## Purpose

Identify the real cause of the reported problem and fix it with the smallest safe change, without hiding symptoms or creating new regressions.

---

## Before Changing Any Code

1. Restate the reported problem in clear terms.
2. Explain what behavior is expected.
3. Explain what behavior is currently happening.
4. Reproduce the problem when possible.
5. Inspect the relevant code, assets, configuration, and recent changes.
6. Separate confirmed facts from assumptions.
7. Explain the most likely root cause.
8. List the files that may need to change.
9. Explain possible risks and side effects.
10. Propose the smallest safe fix that addresses the root cause.
11. Wait for approval before making changes.

---

## During Investigation

- Follow `AGENTS.md`.
- Follow `docs/Developer-Handbook/PERSONAL_RULES.md`.
- Do not modify files until the investigation is complete and approved.
- Prefer evidence over guessing.
- Check logs, console errors, network failures, asset paths, configuration, and Git history when relevant.
- Do not treat a missing generated asset as a code bug without verifying the build pipeline.
- Do not silence errors merely to make the symptom disappear.
- Do not rewrite unrelated systems.
- Do not install or update dependencies without explicit approval.
- Explain each diagnostic command before running it.

---

## During Implementation

- Make the smallest focused change that fixes the confirmed root cause.
- Avoid unrelated refactoring.
- Preserve existing architecture and stable IDs.
- Add or update a regression test when practical.
- Keep fallback behavior intact unless the fix specifically replaces it.
- Do not commit or push without explicit approval.

---

## After Implementation

1. Summarize the confirmed root cause.
2. Explain exactly what changed.
3. Explain why each file changed.
4. Reproduce the original scenario and confirm the bug is fixed.
5. Run the relevant automated tests.
6. Report which tests passed or failed.
7. Mention anything that could not be tested.
8. Check for regressions in closely related behavior.
9. Check and report the current Git status.
10. Recommend any follow-up cleanup or documentation.
11. Wait for review before committing or pushing.