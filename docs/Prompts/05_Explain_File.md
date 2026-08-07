# Explain File Request

## Purpose

Explain the selected file in clear, beginner-friendly language so the project owner understands what it does, how it fits into the project, and how to work with it safely.

---

## Before Explaining

1. Confirm which file should be explained.
2. Read `AGENTS.md`.
3. Read `docs/Developer-Handbook/PERSONAL_RULES.md`.
4. Read the entire selected file.
5. Inspect closely related files only when needed to explain context.
6. Do not modify any files.
7. State clearly if part of the explanation is uncertain or based on inference.

---

## Explanation Structure

Explain the file in this order:

1. Give a one-sentence summary.
2. Explain the file’s main responsibility.
3. Explain why the file exists.
4. Explain where it is used.
5. Describe its important classes, functions, variables, or sections.
6. Explain the normal flow of execution.
7. Explain which other files it communicates with.
8. Explain what data enters the file.
9. Explain what output or effect the file produces.
10. Mention any important assumptions, side effects, or risks.

---

## Teaching Rules

- Use simple English.
- Avoid unnecessary jargon.
- Explain technical terms when they first appear.
- Use examples from this project.
- Compare unfamiliar concepts to something the user already understands.
- Separate confirmed facts from interpretation.
- Do not skip difficult sections merely because they are complex.
- Do not explain every line unless the user asks for a line-by-line explanation.
- Focus on understanding, not just summarizing.

---

## Visual Summary

When useful, include a simple flow such as:

```text
Input

↓

File or System

↓

Processing

↓

Output

```

Also include a short “Remember” summary with the most important idea.

---

## After the Explanation

1. Give a short file cheat-sheet entry of one to three lines.
2. List the most important related files.
3. Mention anything that is still unclear.
4. Suggest one useful next file or concept to study.
5. Do not modify, commit, or push anything.