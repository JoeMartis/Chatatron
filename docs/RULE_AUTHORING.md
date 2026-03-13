# Rule Authoring Guide

How to add a new quality check to Fixatron2000.

## Quick Start (Static Rule)

Adding a rule takes three steps:

1. **Define** the rule in `config/rules.default.json`
2. **Implement** the check function in `src/lib/rules/checks/`
3. **Register** the function in `src/lib/rules/engine.ts`

---

## Step 1: Define the Rule

Add an entry to `config/rules.default.json`:

```json
{
  "id": "html-missing-alt-text",
  "category": "Accessibility",
  "name": "Images Have Alt Text",
  "description": "All <img> elements must have non-empty alt attributes",
  "severity": "error",
  "type": "static",
  "enabled": true,
  "params": {}
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier. Convention: `category-specific-name` in kebab-case |
| `category` | `string` | Display grouping in the results dashboard |
| `name` | `string` | Human-readable name shown in the UI |
| `description` | `string` | Tooltip/detail text explaining what the rule checks |
| `severity` | `"error" \| "warning" \| "info"` | `error` = must fix, `warning` = should fix, `info` = FYI |
| `type` | `"static" \| "ai"` | Whether this is a pattern-based or AI-powered check |
| `enabled` | `boolean` | Whether the rule runs by default |
| `params` | `Record<string, unknown>` | Rule-specific config (e.g., `{ "expectedAttempts": 2 }`) |

### Naming Conventions

Rule IDs follow the pattern `<category>-<specific-check>`:
- `fonts-family-default`
- `assignments-attempts-multiple-choice`
- `knowledge-checks-explanation-present`
- `html-broken-static-links`

Categories should match existing ones where possible: Fonts, Lists, Bolding, Headings, Video, Transcripts, PDF Slides, Terms, AskTIM, Learning Objectives, Summaries, Knowledge Checks, Assignments, Lectures, Recitations, Module Summary, Custom Pages, Admin, Accessibility, Content Quality, Structure.

## Step 2: Implement the Check

Create or extend a file in `src/lib/rules/checks/`. Each check is a function with the signature:

```typescript
import type { CourseTree, RuleConfig, RuleResult, RuleLocation } from "@/lib/rules/types";

export function checkMyNewRule(course: CourseTree, rule: RuleConfig): RuleResult {
  const locations: RuleLocation[] = [];

  // Walk the course tree and find issues
  for (const ch of course.chapters) {
    for (const seq of ch.sequentials) {
      for (const vert of seq.verticals) {
        for (const comp of vert.components) {
          if (comp.type === "html" && hasIssue(comp.htmlContent)) {
            locations.push({
              path: comp.filename,                    // e.g. "html/abc123.xml"
              displayName: `${ch.displayName} > ${seq.displayName} > ${vert.displayName}`,
              detail: "Description of the specific issue found",
              snippet: extractRelevantSnippet(comp),  // optional, shown in UI
            });
          }
        }
      }
    }
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    severity: rule.severity,
    status: locations.length === 0 ? "pass" : "fail",
    message: locations.length === 0
      ? "All clear — no issues found."
      : `${locations.length} issue(s) found.`,
    locations,
  };
}
```

### Key Points

- **Return exactly one `RuleResult`** — the status summarizes all findings.
- **Use `"pass"` when no issues are found**, even if there were zero items to check.
- **Use `"fail"` for errors, but note**: the engine auto-converts `"fail"` to `"warning"` when the rule's severity is `"warning"` (via `alignStatus()`). You can always return `"fail"` and let the engine handle it.
- **The `path` field in `RuleLocation`** should be the component's filename (e.g. `"html/abc123.xml"`, `"problem/xyz.xml"`). This is used by the fix system to locate the file.
- **The `displayName` field** is what the user sees. Use the breadcrumb format: `"Chapter > Sequential > Vertical"`.
- **The `snippet` field** is optional but helpful — show the offending markup (truncated to ~200 chars).

### Accessing Course Data

The `CourseTree` gives you access to everything:

```typescript
course.meta              // CourseMeta: courseId, displayName, selfPaced, dates, etc.
course.policy            // Raw policy.json content
course.gradingPolicy     // Parsed GRADER + GRADE_CUTOFFS
course.chapters          // Chapter[] — the full hierarchy
course.tabs              // TabPage[] — custom pages (Resources, Glossary, etc.)
course.staticFiles       // string[] — filenames in static/ and assets/ dirs
course.sessionPath       // Absolute path to the extracted course on disk
```

#### Component Types

```typescript
// Check component type before accessing type-specific fields:
if (comp.type === "html") {
  comp.htmlContent;       // The raw HTML string
}
if (comp.type === "video") {
  comp.transcripts;       // Record<string, string> of lang → filename
  comp.edxVideoId;        // edX video pipeline ID
  comp.duration;          // Duration in seconds
}
if (comp.type === "problem") {
  comp.rawXml;            // Full problem XML
  comp.problemType;       // "multiplechoiceresponse", "choiceresponse", etc.
  comp.maxAttempts;       // number | null
  comp.showAnswer;        // string
  comp.hasSolution;       // boolean
  comp.solutionText;      // Plain text of the <solution> block
}
if (comp.type === "library_content") {
  comp.problems;          // ProblemComponent[] — nested problems
  comp.sourceLibraryId;   // Library ID string
}
```

### Helper Pattern: Collecting Components

Most checks follow the same pattern of walking the tree. Here's a reusable pattern:

```typescript
function getAllProblems(course: CourseTree): { problem: ProblemComponent; path: string }[] {
  const results: { problem: ProblemComponent; path: string }[] = [];
  for (const ch of course.chapters) {
    for (const seq of ch.sequentials) {
      for (const vert of seq.verticals) {
        for (const comp of vert.components) {
          if (comp.type === "problem") {
            results.push({
              problem: comp,
              path: `${ch.displayName} > ${seq.displayName} > ${vert.displayName}`,
            });
          }
        }
      }
    }
  }
  return results;
}
```

Several check files already define helpers like `getAllHtml()`, `getAllProblems()`, etc. These are currently local to each file. If you need the same traversal, either copy the pattern or extract a shared utility.

## Step 3: Register the Check

In `src/lib/rules/engine.ts`:

1. **Import** your function:

```typescript
import { checkMyNewRule } from "./checks/my-check-file";
```

2. **Add to the `staticChecks` registry** — the key must match the rule's `id`:

```typescript
const staticChecks: Record<string, CheckFn> = {
  // ... existing checks ...
  "html-missing-alt-text": checkMyNewRule,
};
```

That's it. The engine will automatically pick it up for enabled rules of type `"static"`.

---

## Adding an AI-Powered Rule

AI rules follow the same pattern but with an async function and Claude API calls.

### Step 1: Define the Rule

Same as static, but set `"type": "ai"`:

```json
{
  "id": "content-tone-check",
  "category": "Content Quality",
  "name": "Professional Tone",
  "description": "AI checks that course content uses a professional, inclusive tone",
  "severity": "warning",
  "type": "ai",
  "enabled": true,
  "params": {}
}
```

### Step 2: Implement the AI Check

AI checks live in `src/lib/ai/checks.ts` and use the `AiCheckFn` signature:

```typescript
import type { CourseTree, RuleConfig, RuleResult, RuleLocation, AiItemProgress } from "@/lib/rules/types";
import { askClaudeSafe } from "./client";

export async function checkContentTone(
  course: CourseTree,
  rule: RuleConfig,
  apiKey?: string,
  onItemProgress?: (progress: AiItemProgress) => void
): Promise<RuleResult> {
  const locations: RuleLocation[] = [];

  // Collect items to check
  const htmlItems = getAllHtml(course);

  let checked = 0;
  let errors = 0;
  onItemProgress?.({ ruleId: rule.id, checked: 0, total: htmlItems.length });

  for (const { comp, path } of htmlItems) {
    try {
      // Use askClaudeSafe to separate instructions from untrusted content
      const response = await askClaudeSafe(
        // System prompt (trusted instructions):
        `You are reviewing course content for tone. Respond with JSON:
         { "ok": true/false, "issues": ["issue description"] }`,
        // User message (untrusted course content):
        comp.htmlContent,
        1024,
        apiKey
      );

      const parsed = JSON.parse(response);
      checked++;

      if (parsed.ok === false && Array.isArray(parsed.issues)) {
        for (const issue of parsed.issues) {
          locations.push({
            path: comp.filename,
            displayName: path,
            detail: issue,
          });
        }
      }
    } catch (err) {
      errors++;
      // Break on fatal auth errors
      if (err instanceof Anthropic.AuthenticationError) break;
    }

    onItemProgress?.({ ruleId: rule.id, checked: checked + errors, total: htmlItems.length });
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    severity: rule.severity,
    status: locations.length === 0 ? "pass" : "warning",
    message: locations.length === 0
      ? `All ${checked} item(s) passed tone check.`
      : `${locations.length} tone issue(s) found in ${checked} items.`,
    locations,
    ruleType: "ai",
  };
}
```

### Key Differences from Static Checks

| Aspect | Static | AI |
|--------|--------|-----|
| Signature | `CheckFn` (sync) | `AiCheckFn` (async, +apiKey, +onItemProgress) |
| Return | `RuleResult` | `Promise<RuleResult>` |
| Registry | `staticChecks` in engine.ts | `aiChecks` in engine.ts |
| Include `ruleType` | Not needed | Must include `ruleType: "ai"` |
| Progress | N/A | Call `onItemProgress` after each item |
| Error handling | Engine catches thrown errors | Handle errors per-item, break on fatal auth errors |

### Step 3: Register

In `src/lib/rules/engine.ts`, add to the `aiChecks` registry:

```typescript
import { checkContentTone } from "@/lib/ai/checks";

const aiChecks: Record<string, AiCheckFn> = {
  // ... existing AI checks ...
  "content-tone-check": checkContentTone,
};
```

### AI Best Practices

- **Always use `askClaudeSafe()`** — never `askClaude()` for course content. The safe version separates system instructions from untrusted content.
- **Ask for JSON responses** in the system prompt for easy parsing.
- **Handle parse failures gracefully** — Claude may not always return valid JSON. Use a `parseJsonResponse()` helper (see `src/lib/ai/checks.ts` for an example that handles markdown code blocks and bare JSON).
- **Report progress** via `onItemProgress()` — the frontend shows per-item progress bars.
- **Break on authentication errors** — don't burn through items if the API key is invalid.
- **Keep prompts focused** — each AI check should evaluate one specific quality dimension.

---

## Adding a Fix (Optional)

If your rule's issues can be automatically fixed, register a fix function.

### In `src/lib/fixes/registry.ts`:

```typescript
const fixRegistry: Record<string, FixFn> = {
  // ... existing fixes ...
  "my-rule-id": (sessionPath, location, params) => {
    const filePath = resolveComponentPath(sessionPath, location.path);
    // Modify the file in place
    setXmlAttribute(filePath, "problem", "some_attr", "new_value");
  },
};
```

Fix utilities available in `fixes/xml-utils.ts`:
- `setXmlAttribute(filePath, tagName, attrName, attrValue)` — set/add an XML attribute
- `removeInlineStyleProperty(htmlPath, cssProperty)` — remove a CSS property from inline styles
- `replaceBoldTags(htmlPath)` — convert `<b>` to `<strong>`
- `removeWordPasteArtifacts(filePath)` — clean Office paste artifacts
- `removeParagraphsInListItems(htmlPath)` — unwrap `<p>` inside `<li>`
- `removeEmptyParagraphs(htmlPath)` — remove empty `<p>` elements

When a fix is registered, the engine automatically marks matching locations with `fixable: true`, and the UI shows a "Fix" button.

---

## Adding an AI Suggestion (Optional)

For issues that need context-aware suggestions rather than deterministic fixes.

### In `src/lib/fixes/suggest.ts`:

```typescript
const suggestRegistry: Record<string, SuggestFn> = {
  // ... existing suggestions ...
  "my-rule-id": async (courseTree, location, apiKey?) => {
    const content = findHtmlContent(courseTree, location.path);
    if (!content) return "Could not find content.";
    const prompt = myCustomPrompt(content);
    return askClaudeSafe(prompt.system, prompt.content, 1024, apiKey);
  },
};
```

When a suggestion is registered, matching locations get `suggestable: true`, and the UI shows an "AI Suggest" button.

---

## Testing Your Rule

Currently, the fastest way to test:

1. **Build**: `npm run build` (catches type errors)
2. **Run locally**: `npm run dev`
3. **Upload a test course** and verify your rule appears in the results
4. **Check edge cases**: empty course, missing components, malformed XML

When writing checks, consider:
- What if the relevant component type doesn't exist in the course?
- What if the content is empty?
- What if the XML is malformed? (The parser skips unparseable components)
- Does your regex handle multi-line content?

---

## Checklist

- [ ] Rule defined in `config/rules.default.json`
- [ ] Check function implemented in `src/lib/rules/checks/` (static) or `src/lib/ai/checks.ts` (AI)
- [ ] Function registered in `src/lib/rules/engine.ts`
- [ ] (Optional) Fix function in `src/lib/fixes/registry.ts`
- [ ] (Optional) Suggest function in `src/lib/fixes/suggest.ts`
- [ ] Tested with a real course export
