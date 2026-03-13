# Fixatron2000

**Automated quality assurance for UAI Module exports** — catch formatting errors, accessibility issues, broken references, and content problems in seconds instead of hours.

## The Problem

Every edX course goes through a manual QA review in the LMS before publishing. Reviewers click through every unit, checking hundreds of settings, verifying content against a multi-page style guide, and eyeballing formatting one page at a time. This process is slow, error-prone, and doesn't scale — a single course can take **hours** of tedious manual review, and issues still slip through.

## The Solution

Fixatron2000 runs **95 automated QA rules** against an uploaded course in seconds. It catches everything from a missing alt tag to an incorrect grading weight, then **auto-fixes 16 common issues** with one click. For nuanced content problems, it uses **AI-powered analysis** (Claude) to evaluate explanation quality, terminology consistency, and more.

**Upload. Analyze. Fix. Export.** The corrected course is ready to publish.

---

## Key Capabilities

| Capability | Details |
|------------|---------|
| **Instant Analysis** | 91 static rules run in under a second |
| **AI-Powered Checks** | 4 Claude-powered rules for content quality, explanation depth, and terminology |
| **One-Click Fixes** | 16 rules support auto-fix — inline styles, XML attributes, paste artifacts, markup |
| **AI Suggestions** | 5 rules offer AI-generated code suggestions for complex fixes |
| **Live Streaming** | Real-time progress via Server-Sent Events as AI checks run |
| **Safe & Reversible** | Every fix is backed up and individually revertible |
| **Export Ready** | Download the corrected course as `.tar.gz`, ready for edX import |

## What It Checks

95 rules across 18 categories covering the full course structure:

| Category | Rules | What It Catches |
|----------|:-----:|-----------------|
| **Assignments** | 14 | Naming conventions, attempt limits by question type, explanations, numbering |
| **Knowledge Checks** | 9 | Naming, sequential numbering, max attempts, showanswer, explanations, labels |
| **Lectures** | 9 | Naming (L X.Y), overview/summary pages, video duration (5-10 min), title matching |
| **Admin & Settings** | 7 | Grading weights (HW 20%, Assignments 80%), self-paced mode, beta days, discussions |
| **Recitations** | 7 | Naming (R X.Y), overview/summary pages, video duration, title matching |
| **Content Quality** | 7 | Empty content, duplicate choices, single-choice problems, paste artifacts |
| **Transcripts** | 5 | Present, downloadable, not empty, correct speaker name, AI content matching |
| **Library Content** | 5 | Explanations, labels, correct answers, quality checks |
| **Fonts & Formatting** | 4 | Inline font-family, font-size, color styles, Word/Office paste artifacts |
| **Custom Pages** | 4 | Resources, Glossary, Attributions tabs exist, correct course name |
| **Module Summary** | 3 | Exists, has survey link, has dashboard link |
| **Structure** | 3 | Chapters have content, sequential numbering, draft detection |
| **Video** | 2 | Present in lectures/recitations, downloadable |
| **Accessibility** | 2 | Image alt text, no empty links |
| **Broken References** | 2 | Static file links valid, videos have edX IDs |
| **Terms** | 2 | "Learner" vs "student" consistency, acronym pluralization (AI) |
| **PDF Slides** | 2 | Link format and placement standards |
| **Lists, Bolding, Headings** | 4 | `<strong>` for bold, no `<p>` in `<li>`, correct heading levels |
| **+ more** | | Learning objectives, summaries, AskTIM integration |

Every rule is configurable — toggle enabled/disabled, adjust severity, or tweak parameters from the built-in Rules page.

---

## How It Works

```
┌─────────┐     ┌─────────┐     ┌───────────────┐     ┌──────────┐     ┌─────────┐
│  Upload  │────>│  Parse  │────>│    Analyze     │────>│  Review  │────>│ Export  │
│ .tar.gz  │     │  OLX XML │     │ 91 static + 4 AI│     │ Fix/Dismiss│     │ .tar.gz │
└─────────┘     └─────────┘     └───────────────┘     └──────────┘     └─────────┘
```

1. **Upload** — Drag-and-drop a `.tar` or `.tar.gz` edX course export.
2. **Parse** — The server extracts the archive and builds a course tree from the OLX XML structure: `course.xml` -> chapters -> sequentials -> verticals -> components.
3. **Analyze** — 91 static rules run instantly. Optionally, 4 AI-powered rules stream results in real time via SSE.
4. **Review** — Results dashboard groups findings by category with severity, file locations, and detail snippets. Dismiss non-critical issues or apply fixes.
5. **Fix** — One-click auto-fix for 16 rule types. AI-generated suggestions for 5 more. Every fix is reversible.
6. **Export** — Download the corrected course, ready to import back into edX.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

### AI Features (Optional)

AI-powered checks and suggestions require a Claude API key. Enter it in the Results page when prompted — keys are used per-request and never stored.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| AI | Anthropic SDK (Claude Sonnet 4) |
| Parsing | fast-xml-parser, tar |
| Sessions | In-memory store with nanoid IDs, 2-hour TTL |

### Course Tree Structure

The parser builds a hierarchical tree from the edX OLX XML format:

```
Course
├── Chapters (course/chapter/*.xml)
│   └── Sequentials — lectures, assignments, recitations
│       └── Verticals — individual content units
│           └── Components — video, problem, html, library_content
├── Custom Pages (tabs in course/course.xml)
├── Static Assets (static/)
└── Policies (grading_policy.json, policy.json)
```

### Session Management

Each upload creates an isolated session (nanoid ID, 2-hour TTL, max 50 concurrent). Sessions store the parsed course tree, analysis results, fix history for revert, and dismissals. Expired sessions are automatically cleaned up along with their temporary files.

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload and extract course archive |
| POST | `/api/analyze` | Run static analysis |
| GET | `/api/analyze-ai` | Run AI checks (SSE streaming) |
| POST | `/api/fix` | Apply auto-fix to one or all locations |
| POST | `/api/revert` | Revert a previously applied fix |
| POST | `/api/suggest` | Get AI-generated fix suggestion |
| POST/DELETE/GET | `/api/dismiss` | Manage dismissed findings |
| GET | `/api/rules` | Get rule definitions |
| POST | `/api/export` | Re-export corrected course as `.tar.gz` |

### Project Structure

```
src/
  app/                  Next.js app router (pages + API routes)
    api/                REST API endpoints
    results/            Results dashboard page
    rules/              Rule configuration page
  components/           React UI components
  lib/
    parser/             Course export extraction and XML parsing
    rules/              Rules engine, check implementations, types
      checks/           23 check modules organized by category
    ai/                 AI checks, Claude client, prompt templates
    fixes/              Auto-fix registry and AI suggestion system
    store.ts            In-memory session management
config/
  rules.default.json    95 default rule definitions
  rules.custom.json     User overrides
```

### Security

- **Path traversal protection** — Safe path resolution prevents directory traversal in fix operations
- **Rate limiting** — Uploads (10/10min) and AI analysis (5/10min) per client
- **Prompt injection defense** — Untrusted course content sanitized and separated from system prompts
- **No stored credentials** — API keys are used per-request, never persisted

---

## Rule Configuration

Rules are defined in `config/rules.default.json`. Each rule has an id, category, severity (`error` / `warning` / `info`), type (`static` / `ai`), and optional parameters.

Customize rules from the `/rules` page in the UI, or by editing `config/rules.custom.json`. Custom rules override defaults by ID.

Example rule with parameters:
```json
{
  "id": "knowledge-checks-max-attempts",
  "name": "Knowledge Check Max Attempts",
  "category": "Knowledge Checks",
  "severity": "error",
  "type": "static",
  "enabled": true,
  "params": { "expectedAttempts": 3 }
}
```

## Testing

The project includes a comprehensive test suite built with [Vitest](https://vitest.dev/), covering core modules with 254 tests across 15 test files.

```bash
npm test            # Run all tests once
npm run test:watch  # Run tests in watch mode
```

### Test Coverage

| Test File | Tests | Covers |
|-----------|:-----:|--------|
| `xml-utils.test.ts` | 19 | XML parsing, attribute helpers (`getAttr`, `getBoolAttr`, `getNumAttr`, `getChildren`) |
| `rate-limit.test.ts` | 8 | Sliding window rate limiter, client key extraction from headers |
| `store.test.ts` | 24 | Session CRUD, validation, fix history (re-fix preservation), dismissals, AI check status |
| `engine.test.ts` | 7 | Rule filtering, skipped/unknown rules, status alignment, fixable marking |
| `checks.test.ts` | 36 | Font checks, structure checks, accessibility (img alt, empty links), content quality |
| `fix-xml-utils.test.ts` | 19 | XML attribute setting, style removal, Word paste cleanup, bold tag replacement |
| `fix-registry.test.ts` | 5 | Registry lookups, fixable rule detection |
| `ai-client.test.ts` | 12 | Prompt injection sanitization patterns (system tags, INST markers, length capping) |
| `loader.test.ts` | 7 | Default/custom rule loading, merging, saving, field validation |
| `knowledge-checks.test.ts` | 20 | KC naming, numbering, attempts, showanswer, explanations, labels, correct answers |
| `assignments.test.ts` | 23 | Assignment naming, question numbering, attempts, showanswer, overview/summary, notebook links |
| `lectures-video.test.ts` | 19 | Lecture naming, overview/summary, video duration, title matching, video presence/downloadable |
| `remaining-checks.test.ts` | 40 | Lists, bolding, headings, terms, word paste, custom pages, admin/grading, broken refs, module summary |
| `parser.test.ts` | 12 | OLX parsing (course, chapters, sequentials, verticals, video/problem/html/library_content), policies, path traversal |
| `extract.test.ts` | 3 | Tar extraction, course.xml discovery, error handling |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
