# c7 - Context7 CLI

A command-line interface for [Context7](https://context7.com) - fetch up-to-date library documentation directly in your terminal.

Context7 keeps documentation in sync with the latest library releases and surfaces the most relevant snippets for your query. This CLI wraps the [Context7 REST API](https://context7.com/docs/api-guide) and mirrors the same two operations available in the MCP server.

## Install

Requires [Bun](https://bun.com).

```sh
git clone https://github.com/ebeloded/context7-cli
cd context7-cli
bun install
bun link   # makes `c7` available globally
```

Or build a self-contained binary:

```sh
bun run build   # produces ./c7
```

## Usage

```
c7 <library> <query>   Fetch docs (auto-resolves name to ID if needed)
c7 search <name>       Search and list matching libraries
```

## Examples

```sh
# Auto-resolve a library name and get docs
c7 react "how to use hooks"

# Use an exact library ID directly
c7 /facebook/react "useEffect cleanup examples"

# Next.js server components
c7 nextjs "server components with streaming"

# Get output as JSON
c7 react "useState patterns" --type json

# Discover libraries first, then query by ID
c7 search express
c7 /expressjs/express "middleware error handling"
```

## Options

| Flag | Description |
|------|-------------|
| `--type txt\|json` | Output format (default: `txt`) |
| `--help, -h` | Show help |

## Authentication

Set `CONTEXT7_API_KEY` to use your API key for higher rate limits:

```sh
export CONTEXT7_API_KEY=ctx7sk-...
```

Get your key at [context7.com/dashboard](https://context7.com/dashboard).

## Pipe-friendly

Progress and resolver messages go to stderr; documentation goes to stdout. Pipe freely:

```sh
c7 react "hooks overview" | glow
c7 /vercel/next.js "routing" > next-routing.md
```

## How it works

Two REST API endpoints, mirroring the Context7 MCP tools:

| CLI command | API endpoint | MCP equivalent |
|-------------|-------------|----------------|
| `c7 search` | `GET /api/v2/libs/search` | `resolve-library-id` |
| `c7 <lib> <query>` | `GET /api/v2/context` (+ search if needed) | `resolve-library-id` + `query-docs` |
