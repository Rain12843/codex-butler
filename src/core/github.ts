import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface GitHubContext {
  kind: "issue" | "pull_request";
  number: number;
  title: string;
  state: string;
  body: string;
  url: string;
}

function validateNumber(number: number, label: string): void {
  if (!Number.isInteger(number) || number < 1) throw new Error(`${label} number must be a positive integer`);
}

async function gh(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec("gh", args, { timeout: 10000, maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`GitHub CLI request failed: ${detail}`);
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
  if (!Number.isInteger(number) || typeof title !== "string" || typeof state !== "string" || typeof body !== "string" || typeof url !== "string") {
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

export function formatGitHubContext(context: GitHubContext): string {
  const heading = context.kind === "pull_request" ? "Pull Request" : "Issue";
  return `# ${heading} #${context.number}\n\n**${context.title}**\n\n- State: ${context.state}\n- URL: ${context.url}\n\n## Body\n\n${context.body || "(empty)"}\n`;
}
