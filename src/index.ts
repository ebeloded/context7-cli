#!/usr/bin/env bun
import pc from "picocolors";

const BASE_URL = "https://context7.com/api";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

interface Library {
  id: string;
  title: string;
  description: string;
  state: string;
  totalSnippets: number;
  trustScore: number;
  benchmarkScore: number;
  versions: string[];
}

interface SearchResponse {
  results: Library[];
}

interface ErrorResponse {
  message?: string;
  error?: string;
}

function authHeaders(): Record<string, string> {
  const key = process.env.CONTEXT7_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function apiSearch(libraryName: string, query: string): Promise<Library[]> {
  const url = new URL(`${BASE_URL}/v2/libs/search`);
  url.searchParams.set("libraryName", libraryName);
  url.searchParams.set("query", query);

  const res = await fetch(url.toString(), { headers: authHeaders() });
  const body = (await res.json()) as SearchResponse & ErrorResponse;

  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  return body.results;
}

async function apiDocs(
  libraryId: string,
  query: string,
  type: "txt" | "json" = "txt"
): Promise<string> {
  const url = new URL(`${BASE_URL}/v2/context`);
  url.searchParams.set("libraryId", libraryId);
  url.searchParams.set("query", query);
  url.searchParams.set("type", type);

  const res = await fetch(url.toString(), { headers: authHeaders() });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }

  if (type === "json") {
    return JSON.stringify(await res.json(), null, 2);
  }
  return res.text();
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printLibraries(libs: Library[]): void {
  if (!libs.length) {
    console.log(pc.yellow("No libraries found."));
    return;
  }

  for (const lib of libs) {
    const snippets = lib.totalSnippets ? `${lib.totalSnippets} snippets` : "";
    const trust = lib.trustScore != null ? `trust ${lib.trustScore}/10` : "";
    const score =
      lib.benchmarkScore != null ? `score ${lib.benchmarkScore.toFixed(0)}` : "";
    const meta = [snippets, trust, score].filter(Boolean).join(pc.dim(" · "));

    console.log(`${pc.bold(pc.cyan(lib.id))}  ${pc.dim(lib.title)}`);
    if (lib.description) console.log(`  ${lib.description}`);
    if (meta) console.log(`  ${pc.dim(meta)}`);
    if (lib.state !== "finalized") console.log(`  ${pc.yellow(`state: ${lib.state}`)}`);
    if (lib.versions?.length) {
      console.log(`  ${pc.dim(`versions: ${lib.versions.slice(0, 5).join(", ")}`)}`);
    }
    console.log();
  }
}

function printHelp(): void {
  console.log(`${pc.bold("c7")} - Context7 CLI

${pc.bold("Usage:")}
  c7 <library> <query>              Auto-resolve library and get docs
  c7 get <library> <query>          Same (explicit subcommand)
  c7 docs <library-id> <query>      Get docs by exact library ID
  c7 search <name> [--query <ctx>]  Search and list matching libraries

${pc.bold("Options:")}
  --type txt|json    Output format (default: txt)
  --query, -q        Context string for relevance ranking (search only)
  --help, -h         Show this help

${pc.bold("Examples:")}
  c7 react "how to use hooks"
  c7 /facebook/react "useEffect examples"
  c7 get nextjs "server components with streaming"
  c7 docs /vercel/next.js "middleware authentication"
  c7 search express --query "REST API routing"
  c7 react "useState patterns" --type json

${pc.dim("Set CONTEXT7_API_KEY environment variable for higher rate limits.")}`);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdSearch(name: string, query: string): Promise<void> {
  const libs = await apiSearch(name, query);
  printLibraries(libs);
}

async function cmdDocs(
  libraryId: string,
  query: string,
  type: "txt" | "json"
): Promise<void> {
  const out = await apiDocs(libraryId, query, type);
  process.stdout.write(out);
  if (!out.endsWith("\n")) process.stdout.write("\n");
}

async function cmdGet(
  library: string,
  query: string,
  type: "txt" | "json"
): Promise<void> {
  let libraryId = library;

  // If not already in /owner/repo format, resolve it first
  if (!/^\/[^/]+\/[^/]+/.test(library)) {
    process.stderr.write(pc.dim(`Resolving "${library}"...\n`));
    const libs = await apiSearch(library, query);
    if (!libs.length) {
      throw new Error(`No libraries found for "${library}"`);
    }
    libraryId = libs.at(0)!.id;
    process.stderr.write(pc.dim(`Using ${libraryId}\n\n`));
  }

  await cmdDocs(libraryId, query, type);
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flags: Record<string, string> = {};
const positionals: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]!;
  if (arg === "--help" || arg === "-h") {
    flags["help"] = "true";
  } else if (arg === "--type" || arg === "-t") {
    flags["type"] = argv[++i] ?? "txt";
  } else if (arg === "--query" || arg === "-q") {
    flags["query"] = argv[++i] ?? "";
  } else if (arg.startsWith("--")) {
    const eqIdx = arg.indexOf("=");
    if (eqIdx !== -1) {
      flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
    } else {
      flags[arg.slice(2)] = argv[++i] ?? "true";
    }
  } else {
    positionals.push(arg);
  }
}

const outputType = (flags["type"] === "json" ? "json" : "txt") as "txt" | "json";
const [cmd, ...rest] = positionals;

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

if (flags["help"] || !cmd) {
  printHelp();
  process.exit(0);
}

try {
  if (cmd === "search") {
    const [name] = rest;
    if (!name) {
      console.error(pc.red('Usage: c7 search <name> [--query <context>]'));
      process.exit(1);
    }
    await cmdSearch(name, flags["query"] ?? "documentation");
  } else if (cmd === "docs") {
    const [id, query] = rest;
    if (!id || !query) {
      console.error(pc.red("Usage: c7 docs <library-id> <query>"));
      process.exit(1);
    }
    await cmdDocs(id, query, outputType);
  } else if (cmd === "get") {
    const [library, query] = rest;
    if (!library || !query) {
      console.error(pc.red("Usage: c7 get <library> <query>"));
      process.exit(1);
    }
    await cmdGet(library, query, outputType);
  } else {
    // Default: treat first arg as library, second as query
    const [query] = rest;
    if (!query) {
      console.error(pc.red("Usage: c7 <library> <query>"));
      console.error(pc.dim('Run "c7 --help" for usage information.'));
      process.exit(1);
    }
    await cmdGet(cmd, query, outputType);
  }
} catch (err) {
  console.error(pc.red(`Error: ${(err as Error).message}`));
  process.exit(1);
}
