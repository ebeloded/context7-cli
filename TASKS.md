# Context7 CLI - Task Plan

## Overview

Build a CLI (`c7`) that wraps the Context7 REST API, mirroring the two MCP tools
(`resolve-library-id` and `query-docs`) in a terminal-friendly interface.

**Stack:** Bun + TypeScript + picocolors
**API base:** `https://context7.com/api`
**Auth:** `CONTEXT7_API_KEY` env var (Bearer token, optional - free tier has rate limits)

---

## API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v2/libs/search` | GET | Search/resolve library names to IDs |
| `/v2/context` | GET | Fetch documentation for a library ID |

### `/v2/libs/search`
- `libraryName` (required) - name to search
- `query` (required) - natural language context for ranking
- Returns: `{ results: Library[] }`

### `/v2/context`
- `libraryId` (required) - e.g. `/facebook/react`
- `query` (required) - what to look up
- `type` (optional) - `"txt"` (default) or `"json"`
- Returns: plain text markdown or JSON with `codeSnippets` + `infoSnippets`

---

## CLI Commands

```
c7 <library> <query>                   # default: auto-resolve + get docs
c7 get <library> <query> [--type txt]  # explicit: same as above
c7 docs <library-id> <query>           # get docs by exact ID
c7 search <name> [--query <ctx>]       # list matching libraries
```

---

## Tasks

### Phase 1 - Core (DONE)

- [x] Project scaffold (bun init, package.json, tsconfig.json)
- [x] `src/index.ts` with all three commands + default fallback
- [x] API client: `apiSearch()` and `apiDocs()`
- [x] Terminal output formatting with picocolors
- [x] Auth headers from `CONTEXT7_API_KEY` env var
- [x] Manual arg parsing (no framework dependency)

### Phase 2 - Dependencies & Wiring

- [ ] `bun install` to add picocolors
- [ ] Smoke-test all three commands against live API
- [ ] Verify `--type json` output is valid JSON

### Phase 3 - Quality

- [ ] Handle `301 Moved Permanently` redirect responses (follow `redirectUrl` in body)
- [ ] Handle `202 Accepted` (library still processing) with a clear message
- [ ] Handle rate limit (`429`) with `Retry-After` display
- [ ] Validate library ID format before calling docs API
- [ ] `--tokens N` flag: limit output length (post-process client-side by truncating)

### Phase 4 - UX Polish

- [ ] `--no-color` / `NO_COLOR` env var support (picocolors handles this automatically)
- [ ] Progress spinner for multi-step `get` command (resolve + fetch)
- [ ] `c7 search` output: show top result highlighted
- [ ] Pipe-friendly output: suppress progress/resolver messages when stdout is not a TTY

### Phase 5 - Distribution

- [ ] `bun build --compile` to produce a single self-contained `c7` binary
- [ ] `bun link` to install globally for dev use
- [ ] Update README with install instructions and all command examples
- [ ] Consider publishing to npm as `context7-cli`

---

## File Structure

```
context7-cli/
├── src/
│   └── index.ts        # single-file CLI (all commands + API client)
├── package.json
├── tsconfig.json
├── CLAUDE.md           # bun-specific project instructions
├── TASKS.md            # this file
└── README.md
```

---

## Notes

- The Context7 TypeScript SDK (`@upstash/context7-sdk`) exists but is marked "Work in
  Progress" - the CLI uses the REST API directly for stability.
- Bun loads `.env` automatically, so `CONTEXT7_API_KEY` works without dotenv.
- The `bin` field in package.json points to the `.ts` source - Bun handles transpilation.
- For production binaries, `bun build --compile` bundles everything into a native executable.
