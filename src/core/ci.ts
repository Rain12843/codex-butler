import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface WorkflowRunSummary {
  databaseId: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  commit: string;
  url: string;
  createdAt: string;
}

async function gh(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec("gh", args, { timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`GitHub CLI request failed: ${detail}`);
  }
}

function parseRuns(raw: string): WorkflowRunSummary[] {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("GitHub CLI returned invalid workflow JSON"); }
  if (!Array.isArray(value)) throw new Error("GitHub CLI returned an invalid workflow list");
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object").map((item) => {
    if (!Number.isInteger(item.databaseId) || typeof item.name !== "string" || typeof item.status !== "string" || (item.conclusion !== null && typeof item.conclusion !== "string") || typeof item.headBranch !== "string" || typeof item.headSha !== "string" || typeof item.url !== "string" || typeof item.createdAt !== "string") {
      throw new Error("GitHub CLI returned incomplete workflow data");
    }
    return { databaseId: item.databaseId, name: item.name, status: item.status, conclusion: item.conclusion, branch: item.headBranch, commit: item.headSha, url: item.url, createdAt: item.createdAt };
  });
}

export async function getRecentWorkflowRuns(limit = 10): Promise<WorkflowRunSummary[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Workflow limit must be an integer from 1 to 50");
  const raw = await gh(["run", "list", "--limit", String(limit), "--json", "databaseId,name,status,conclusion,headBranch,headSha,url,createdAt"]);
  return parseRuns(raw);
}

export function formatWorkflowRuns(runs: WorkflowRunSummary[]): string {
  if (!runs.length) return "# GitHub Actions\n\nNo workflow runs found.\n";
  const lines = ["# GitHub Actions", "", "| Workflow | Status | Branch | Commit | Created |", "| --- | --- | --- | --- | --- |"];
  for (const run of runs) lines.push(`| ${run.name} | ${run.conclusion ?? run.status} | ${run.branch} | ${run.commit.slice(0, 7)} | ${run.createdAt} |`);
  return lines.join("\n") + "\n";
}
