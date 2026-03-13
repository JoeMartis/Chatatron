# CLAUDE.md — Session Context for Fixatron2000

## What This Project Is

Fixatron2000 is an automated QA system for edX course exports. It runs 95 static checks + 4 AI-powered rules against uploaded `.tar.gz` course exports, auto-fixes 16 common issues, and provides AI suggestions for 5 more.

**Tech:** Next.js 16, React 19, TypeScript, Anthropic SDK (Claude Sonnet 4), fast-xml-parser, Tailwind CSS 4.

## Branch & Git

- **Working branch:** `claude/security-bug-scan-jULxR`
- **Base:** `main` (merge base: `21039bd`)
- **Push command:** `git push -u origin claude/security-bug-scan-jULxR`

### Commits on this branch (oldest → newest):
1. `ae50828` — Polish and modernize UI across all pages
2. `7af08f8` — Add AI feedback download button and monkey mascot
3. `869dd36` — Fix export download path validation to match upload directory
4. `aa135e2` — Fix warning-severity rules showing as failures
5. `5f4a8eb` — Hide "Add Rule" button until phase 2 AI-powered rule creation
6. `2887a9d` — Rewrite README to lead with business value and impact
7. `d1ce7fe` — Fix README problem statement to reflect LMS-based QA workflow
8. `3f104fe` — Add architecture doc and rule authoring guide
9. `f8c3859` — Add comprehensive test suite with Vitest (130 tests)
10. `4f9b05f` — Update README with testing section and scripts
11. `3f559d8` — Expand test suite to 254 tests across 15 files

## Test Suite

**254 tests, 15 files, all passing.** Run with `npm test`.

Test files in `src/lib/__tests__/`:
- `xml-utils.test.ts` (19) — XML parsing helpers
- `rate-limit.test.ts` (8) — Sliding window rate limiter
- `store.test.ts` (24) — Session management, fix history, dismissals
- `engine.test.ts` (7) — Rules engine, filtering, status alignment
- `checks.test.ts` (36) — Font, structure, accessibility, content quality checks
- `fix-xml-utils.test.ts` (19) — XML/HTML fix utilities
- `fix-registry.test.ts` (5) — Fix function registry
- `ai-client.test.ts` (12) — Prompt injection sanitization
- `loader.test.ts` (7) — Rule config loading/merging
- `knowledge-checks.test.ts` (20) — KC naming, numbering, attempts, explanations
- `assignments.test.ts` (23) — Assignment naming, numbering, attempts, notebook links
- `lectures-video.test.ts` (19) — Lecture naming, overview/summary, video checks
- `remaining-checks.test.ts` (40) — Lists, bolding, headings, terms, word paste, custom pages, admin, broken refs, module summary
- `parser.test.ts` (12) — OLX course parsing with file fixtures
- `extract.test.ts` (3) — Tar extraction

## Key Source Directories

```
src/lib/parser/         — Course export extraction and OLX XML parsing
src/lib/rules/          — Rules engine + types
src/lib/rules/checks/   — 23 check modules (one per category)
src/lib/ai/             — Claude API client, AI checks, prompts
src/lib/fixes/          — Auto-fix registry + XML manipulation utils
src/lib/store.ts        — In-memory session store (2hr TTL, max 50)
src/lib/rate-limit.ts   — Sliding window rate limiter
src/app/api/            — REST API routes (upload, analyze, fix, revert, suggest, export, etc.)
src/components/         — React UI components
config/                 — rules.default.json (95 rules), rules.custom.json
docs/                   — ARCHITECTURE.md, RULE_AUTHORING.md
```

## Commands

```bash
npm test            # Run tests (vitest)
npm run test:watch  # Watch mode
npm run dev         # Dev server
npm run build       # Production build
npm run lint        # ESLint
```
