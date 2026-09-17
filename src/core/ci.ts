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
    const databaseId = item.databaseId;
    const name = item.name;
    const status = item.status;
    const conclusion = item.conclusion;
    const branch = item.headBranch;
    const commit = item.headSha;
    const url = item.url;
    const createdAt = item.createdAt;
    if (!Number.isInteger(databaseId) || typeof name !== "string" || typeof status !== "string" || (conclusion !== null && typeof conclusion !== "string") || typeof branch !== "string" || typeof commit !== "string" || typeof url !== "string" || typeof createdAt !== "string") {
      throw new Error("GitHub CLI returned incomplete workflow data");
    }
    return { databaseId, name, status, conclusion, branch, commit, url, createdAt };
  });
}

function tableCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

export async function getRecentWorkflowRuns(limit = 10): Promise<WorkflowRunSummary[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Workflow limit must be an integer from 1 to 50");
  const raw = await gh(["run", "list", "--limit", String(limit), "--json", "databaseId,name,status,conclusion,headBranch,headSha,url,createdAt"]);
  return parseRuns(raw);
}

export function formatWorkflowRuns(runs: WorkflowRunSummary[]): string {
  if (!runs.length) return "# GitHub Actions\n\nNo workflow runs found.\n";
  const lines = ["# GitHub Actions", "", "| Workflow | Status | Branch | Commit | Created |", "| --- | --- | --- | --- | --- |"];
  for (const run of runs) lines.push(`| ${tableCell(run.name)} | ${tableCell(run.conclusion ?? run.status)} | ${tableCell(run.branch)} | ${tableCell(run.commit.slice(0, 7))} | ${tableCell(run.createdAt)} |`);
  return lines.join("\n") + "\n";
}
