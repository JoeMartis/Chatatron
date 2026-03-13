# Fixatron2000 Architecture

## Overview

Fixatron2000 is a **Next.js** web application that performs automated quality assurance on **edX/Open edX course exports**. Users upload a `.tar.gz` course export, and the system runs 70+ static checks (and optional AI-powered checks) against the parsed course structure, then presents results in a dashboard with one-click fixes and AI-generated suggestions.

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│  Browser UI │────▶│  Next.js API  │────▶│    Parser    │────▶│  Rule Engine  │
│ (React/TSX) │◀────│   Routes     │◀────│  (XML→Tree)  │     │ Static + AI   │
└─────────────┘     └──────────────┘     └──────────────┘     └───────────────┘
                           │                                         │
                           ▼                                         ▼
                    ┌──────────────┐                          ┌──────────────┐
                    │   In-Memory  │                          │  Fix / Suggest│
                    │   Session    │                          │  Registries   │
                    │   Store      │                          └──────────────┘
                    └──────────────┘
```

## Technology Stack

- **Runtime**: Node.js with Next.js (App Router)
- **Language**: TypeScript
- **UI**: React with Tailwind CSS
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`)
- **Parser**: `fast-xml-parser` (via `xml-utils.ts`)
- **Archive extraction**: `tar` npm package

## Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Upload page (home)
│   ├── results/page.tsx      # Results dashboard
│   ├── rules/page.tsx        # Rule editor page
│   ├── layout.tsx            # Root layout
│   └── api/                  # API route handlers
│       ├── upload/           # POST — upload & parse course
│       ├── analyze/          # POST — run static checks; GET — poll results
│       ├── analyze-ai/       # POST — run AI checks (streaming progress)
│       ├── fix/              # POST — apply a deterministic fix
│       ├── revert/           # POST — undo a fix
│       ├── suggest/          # POST — get AI-generated suggestion
│       ├── dismiss/          # POST — dismiss a finding
│       ├── export/           # POST — download fixed course as .tar.gz
│       ├── rules/            # GET/PUT — read/save rule configuration
│       └── test-suggest/     # POST — test suggestion prompts
├── components/               # React components
│   ├── UploadForm.tsx        # File upload + progress
│   ├── ResultsDashboard.tsx  # Main results view
│   ├── RuleCategory.tsx      # Collapsible category group
│   ├── RuleResult.tsx        # Individual rule result card
│   ├── RuleEditor.tsx        # Rule enable/disable + params
│   ├── AiChecksProgress.tsx  # AI check progress indicator
│   └── Nav.tsx               # Navigation bar
├── lib/
│   ├── parser/               # Course export parsing
│   │   ├── extract.ts        # Tar extraction with security guards
│   │   ├── course-tree.ts    # XML → CourseTree builder
│   │   └── xml-utils.ts      # XML parsing helpers
│   ├── rules/                # Rule system
│   │   ├── types.ts          # All type definitions
│   │   ├── engine.ts         # Check execution + registries
│   │   ├── loader.ts         # Rule config loader (default + custom)
│   │   └── checks/           # Individual check implementations
│   │       ├── fonts.ts
│   │       ├── lists.ts
│   │       ├── bolding.ts
│   │       ├── headings.ts
│   │       ├── video.ts
│   │       ├── transcripts.ts
│   │       ├── pdf-slides.ts
│   │       ├── terms.ts
│   │       ├── ask-tim.ts
│   │       ├── learning-objectives.ts
│   │       ├── summaries.ts
│   │       ├── knowledge-checks.ts
│   │       ├── assignments.ts
│   │       ├── lectures.ts
│   │       ├── recitations.ts
│   │       ├── module-summary.ts
│   │       ├── custom-pages.ts
│   │       ├── admin.ts
│   │       ├── accessibility.ts
│   │       ├── broken-references.ts
│   │       ├── content-quality.ts
│   │       ├── word-paste.ts
│   │       ├── structure.ts
│   │       └── library-content.ts
│   ├── ai/                   # AI-powered features
│   │   ├── client.ts         # Anthropic SDK wrapper + prompt injection defence
│   │   ├── checks.ts         # AI check implementations
│   │   ├── prompts.ts        # Prompt templates for AI checks
│   │   └── suggest-prompts.ts # Prompt templates for AI suggestions
│   ├── fixes/                # Automated fix system
│   │   ├── registry.ts       # Deterministic fix functions
│   │   ├── suggest.ts        # AI suggestion functions
│   │   └── xml-utils.ts      # XML manipulation for fixes
│   ├── store.ts              # In-memory session store
│   ├── rate-limit.ts         # Rate limiting
│   └── static-resolve.ts     # Static file resolution
config/
├── rules.default.json        # Default rule definitions
└── rules.custom.json         # User overrides (generated at runtime)
```

## Core Data Flow

### 1. Upload & Parse

```
User uploads .tar.gz
    → POST /api/upload
    → extractTar() — safe extraction with tar-bomb & zip-slip protection
    → parseCourseExport() — walks the edX XML structure, builds CourseTree
    → setSession() — stores CourseTree in memory, returns sessionId
```

The parser reads the edX OLX format: `course.xml` → `course/<run>.xml` → chapters → sequentials → verticals → components (video, problem, html, library_content). Each level is parsed from its own XML file, linked by `url_name` attributes.

### 2. Static Analysis

```
POST /api/analyze { sessionId }
    → loadAllRules() — merge default + custom rules
    → runStaticChecks(courseTree, rules) — iterate enabled rules, call check fns
    → Returns AnalysisResults with pass/fail/warning/skipped per rule
```

Each static check receives the full `CourseTree` and its `RuleConfig`, returns a single `RuleResult` with zero or more `RuleLocation` entries identifying specific issues.

### 3. AI Analysis

```
POST /api/analyze-ai { sessionId, apiKey }
    → runAiChecks(courseTree, rules, apiKey, onProgress)
    → Streams progress events via ReadableStream (SSE-style)
    → Each AI check calls Claude via askClaudeSafe() with system/user separation
    → Results merged into session's AnalysisResults
```

AI checks run with a concurrency limit of 3 to avoid API rate limits. Progress events are streamed to the frontend for real-time updates.

### 4. Fixes & Suggestions

Two remediation paths exist:

- **Deterministic fixes** (`/api/fix`): Registered in `fixes/registry.ts`. These directly modify the course XML/HTML files (e.g., setting `max_attempts`, removing inline styles). Each fix is backed up for revert support.

- **AI suggestions** (`/api/suggest`): Registered in `fixes/suggest.ts`. These call Claude to generate context-aware fix suggestions (e.g., writing an explanation, replacing terminology). The suggestion text is returned to the user for review — not auto-applied.

### 5. Export

```
POST /api/export { sessionId }
    → Tars up the (possibly fixed) course directory
    → Returns .tar.gz for download
```

## Key Types

Defined in `src/lib/rules/types.ts`:

| Type | Purpose |
|------|---------|
| `CourseTree` | Complete parsed course: meta, chapters, tabs, static files |
| `Chapter > Sequential > Vertical > Component` | Hierarchical course structure |
| `Component` | Union: `VideoComponent \| ProblemComponent \| HtmlComponent \| LibraryContentComponent` |
| `RuleConfig` | Rule definition: id, category, name, severity, type, enabled, params |
| `RuleResult` | Check outcome: status (pass/fail/warning/skipped), message, locations |
| `RuleLocation` | Where an issue was found: path, displayName, detail, snippet, fixable/suggestable |
| `CheckFn` | `(course: CourseTree, rule: RuleConfig) => RuleResult` |
| `AiCheckFn` | Async version with optional apiKey and progress callback |

## Session Management

The application uses an **in-memory session store** (`src/lib/store.ts`):

- Sessions are keyed by a `nanoid(12)` session ID
- TTL: 2 hours of inactivity
- Max 50 concurrent sessions (LRU eviction)
- Each session holds: `CourseTree`, `AnalysisResults`, fix history, dismissals, AI check status
- Session files (extracted course) are cleaned up on eviction

## Security

- **Tar extraction**: Blocks symlinks, hard links, zip-slip paths; limits file count (10k) and total size (2GB)
- **Path traversal**: All file operations use `safePath()` to ensure paths stay within the session directory
- **Prompt injection**: AI calls use `askClaudeSafe()` which separates trusted instructions (system prompt) from untrusted course content (user message), plus sanitization of injection patterns
- **Rate limiting**: Upload endpoint limited to 10 uploads per 10 minutes per client
- **Input validation**: Session IDs and rule IDs are validated with regex patterns
- **File naming**: Uploaded files get safe generated names (never user-supplied filenames)

## Rule Configuration

Rules are defined in `config/rules.default.json` as an array of `RuleConfig` objects. Each rule specifies:

- `id` — unique identifier matching a key in the static/AI check registry
- `category` — display grouping (Fonts, Video, Assignments, etc.)
- `type` — `"static"` or `"ai"`
- `severity` — `"error"`, `"warning"`, or `"info"`
- `enabled` — whether the rule runs by default
- `params` — rule-specific configuration (e.g., expected attempt counts)

Custom rules (`config/rules.custom.json`) override defaults by ID and can add new rules. Managed via the `/api/rules` endpoint and the Rules Editor UI.
