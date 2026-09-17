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

async function gh(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec("gh", args, { timeout: 10000, maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`GitHub CLI request failed: ${detail}`);
  }
}

export async function getIssueContext(number: number): Promise<GitHubContext> {
  if (!Number.isInteger(number) || number < 1) throw new Error("Issue number must be a positive integer");
  const raw = await gh(["issue", "view", String(number), "--json", "number,title,state,body,url"]);
  const value = JSON.parse(raw) as Omit<GitHubContext, "kind">;
  return { ...value, kind: "issue" };
}

export async function getPullRequestContext(number: number): Promise<GitHubContext> {
  if (!Number.isInteger(number) || number < 1) throw new Error("Pull request number must be a positive integer");
  const raw = await gh(["pr", "view", String(number), "--json", "number,title,state,body,url"]);
  const value = JSON.parse(raw) as Omit<GitHubContext, "kind">;
  return { ...value, kind: "pull_request" };
}

export function formatGitHubContext(context: GitHubContext): string {
  const heading = context.kind === "pull_request" ? "Pull Request" : "Issue";
  return `# ${heading} #${context.number}\n\n**${context.title}**\n\n- State: ${context.state}\n- URL: ${context.url}\n\n## Body\n\n${context.body || "(empty)"}\n`;
}
