# Refactor Request

## Purpose

Improve the internal structure, readability, or maintainability of existing code without changing its intended behavior.

---

## Before Changing Any Code

1. Explain what part of the code should be refactored.
2. Explain why the refactor is needed.
3. Identify the current problems clearly.
4. Confirm which behavior must remain unchanged.
5. List the files that may need to change.
6. Explain possible risks and regressions.
7. Propose the smallest useful refactor.
8. Explain how the result will be tested.
9. Wait for approval before making changes.

---

## Refactor Rules

- Follow `AGENTS.md`.
- Follow `docs/Developer-Handbook/PERSONAL_RULES.md`.
- Preserve existing behavior unless a behavior change is explicitly requested.
- Preserve stable IDs and save-game compatibility.
- Avoid changing public interfaces unless necessary and approved.
- Do not mix the refactor with unrelated feature work or bug fixes.
- Do not rename files, classes, functions, or IDs without explaining why.
- Prefer clear, simple code over clever abstractions.
- Do not introduce new dependencies without explicit approval.
- Do not modify generated files unless the generation process requires it.
- Keep the refactor small enough to review and test safely.
- Do not commit or push without explicit approval.

---

## During Implementation

- Make changes in small, understandable steps.
- Keep each change focused on the approved refactor goal.
- Explain important structural decisions.
- Update tests when internal structure changes affect test coverage.
- Run tests after meaningful stages when practical.
- Stop and ask for clarification if the refactor becomes larger than planned.
- Do not continue into a wider redesign without approval.

---

## After Implementation

1. Summarize what was refactored.
2. Confirm that intended behavior remains unchanged.
3. Explain why each file changed.
4. Describe any interfaces, names, or structures that changed.
5. Report which tests were run and whether they passed.
6. Mention anything that could not be tested.
7. Check for regressions in closely related behavior.
8. Check and report the current Git status.
9. Recommend any follow-up cleanup separately.
10. Wait for review before committing or pushing.