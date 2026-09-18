import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { redactSensitiveText } from "./redaction.js";

const exec = promisify(execFile);

export interface GitHubContext {
  kind: "issue" | "pull_request";
  number: number;
  title: string;
  state: string;
  body: string;
  url: string;
}

export interface PullRequestDiffAnalysis {
  number: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  changedFiles: string[];
  warnings: string[];
  diffExcerpt: string;
}

function validateNumber(number: number, label: string): void {
  if (!Number.isInteger(number) || number < 1) throw new Error(`${label} number must be a positive integer`);
}

async function gh(args: string[], maxBuffer = 1024 * 1024): Promise<string> {
  try {
    const result = await exec("gh", args, { timeout: 15000, maxBuffer });
    return String(result.stdout).trim();
  } catch (error) {
    const candidate = error as { stdout?: unknown; stderr?: unknown };
    const output = [candidate.stdout, candidate.stderr].filter(Boolean).map(String).join("\n").trim();
    if (output) throw new Error(`GitHub CLI request failed: ${output.slice(0, 2000)}`);
    throw new Error(`GitHub CLI request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseContext(raw: string, kind: GitHubContext["kind"]): GitHubContext {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("GitHub CLI returned invalid JSON"); }
  if (!value || typeof value !== "object") throw new Error("GitHub CLI returned an invalid object");
  const item = value as Record<string, unknown>;
  const number = item.number;
  const title = item.title;
  const state = item.state;
  const body = item.body;
  const url = item.url;
  if (typeof number !== "number" || !Number.isInteger(number) || typeof title !== "string" || typeof state !== "string" || typeof body !== "string" || typeof url !== "string") {
    throw new Error("GitHub CLI returned incomplete issue/PR data");
  }
  return { kind, number, title, state, body, url };
}

export async function getIssueContext(number: number): Promise<GitHubContext> {
  validateNumber(number, "Issue");
  return parseContext(await gh(["issue", "view", String(number), "--json", "number,title,state,body,url"]), "issue");
}

export async function getPullRequestContext(number: number): Promise<GitHubContext> {
  validateNumber(number, "Pull request");
  return parseContext(await gh(["pr", "view", String(number), "--json", "number,title,state,body,url"]), "pull_request");
}

export async function getPullRequestDiff(number: number): Promise<string> {
  validateNumber(number, "Pull request");
  return gh(["pr", "diff", String(number), "--patch"], 4 * 1024 * 1024);
}

export function analyzeDiffText(number: number, diff: string): PullRequestDiffAnalysis {
  validateNumber(number, "Pull request");
  const changedFiles: string[] = [];
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git a/")) {
      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      const file = match?.[2];
      if (file) changedFiles.push(file);
      continue;
    }
    if (line.startsWith("+++ ") || line.startsWith("--- ") || line.startsWith("@@")) continue;
    if (line.startsWith("+")) additions++;
    else if (line.startsWith("-")) deletions++;
  }

  const warnings = new Set<string>();
  const lower = diff.toLowerCase();
  if (/\b(api[_ -]?key|secret|token|password)\s*[:=]/i.test(diff) || /-----begin [^-\r\n]*private key-----/i.test(diff)) warnings.add("The diff contains credential-like material; inspect it before committing.");
  if (/curl\s+[^\n|]+\|\s*(sh|bash)|wget\s+[^\n|]+\|\s*(sh|bash)/i.test(diff)) warnings.add("The diff introduces a remote-download-and-shell pattern.");
  if (/rm\s+-rf\s+(\/|~|\$home)/i.test(diff)) warnings.add("The diff contains a broad recursive delete command.");
  if (/chmod\s+777|sudo\s+/i.test(diff)) warnings.add("The diff introduces elevated privileges or broad permission changes.");
  if (/package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?/.test(lower) && /package\.json/.test(lower)) warnings.add("Dependency manifest and lockfile both changed; verify they remain synchronized.");
  if (changedFiles.some((file) => /(^|\/)(\.env|.*\.pem|.*\.key)$/.test(file))) warnings.add("The diff changes a potentially sensitive environment or key file.");

  const lines = diff.split("\n").filter((line) => line.trim());
  const diffExcerpt = redactSensitiveText(lines.slice(0, 120).join("\n")).slice(0, 12000);
  return { number, filesChanged: changedFiles.length, additions, deletions, changedFiles: changedFiles.slice(0, 100), warnings: [...warnings], diffExcerpt };
}

export async function analyzePullRequestDiff(number: number): Promise<PullRequestDiffAnalysis> {
  return analyzeDiffText(number, await getPullRequestDiff(number));
}

export function formatPullRequestDiffAnalysis(analysis: PullRequestDiffAnalysis): string {
  return [
    `# Pull Request Diff #${analysis.number}`,
    "",
    `- Files changed: ${analysis.filesChanged}`,
    `- Additions: ${analysis.additions}`,
    `- Deletions: ${analysis.deletions}`,
    "",
    "## Changed files",
    analysis.changedFiles.length ? analysis.changedFiles.map((file) => `- ${file}`).join("\n") : "- None detected",
    "",
    "## Warnings",
    analysis.warnings.length ? analysis.warnings.map((warning) => `- ${warning}`).join("\n") : "- No known risky patterns detected.",
    "",
    "## Untrusted diff excerpt",
    "",
    "```diff",
    analysis.diffExcerpt || "No diff content returned.",
    "```",
    ""
  ].join("\n");
}

export function formatGitHubContext(context: GitHubContext): string {
  const heading = context.kind === "pull_request" ? "Pull Request" : "Issue";
  const title = redactSensitiveText(context.title);
  const body = redactSensitiveText(context.body);
  return `# ${heading} #${context.number}\n\n**${title}**\n\n- State: ${context.state}\n- URL: ${context.url}\n\n## Body\n\n${body || "(empty)"}\n`;
}
