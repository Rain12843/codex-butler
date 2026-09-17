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

export interface WorkflowDiagnosis {
  runId: number;
  summary: WorkflowRunSummary | null;
  failedSteps: string[];
  category: string;
  likelyCause: string;
  nextSteps: string[];
  logExcerpt: string;
}

async function gh(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec("gh", args, { timeout: 15000, maxBuffer: 4 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const candidate = error as { stdout?: string; stderr?: string; message?: string };
    const output = [candidate.stdout, candidate.stderr].filter((value): value is string => typeof value === "string" && value.length > 0).join("\n").trim();
    if (output) return output;
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

function validateRunId(runId: number): void {
  if (!Number.isInteger(runId) || runId < 1) throw new Error("Workflow run ID must be a positive integer");
}

function classifyLog(log: string): Pick<WorkflowDiagnosis, "category" | "likelyCause" | "nextSteps"> {
  const lower = log.toLowerCase();
  if (/ts\d{4}|typescript|tsc\b/.test(lower)) return { category: "TypeScript", likelyCause: "The workflow reached a TypeScript type-checking error.", nextSteps: ["Run `npm run check` locally.", "Fix the first TypeScript error before addressing downstream errors.", "Run the full test suite after the type check passes."] };
  if (/npm err!|npm error|npm ci|npm install/.test(lower)) return { category: "npm / dependencies", likelyCause: "The dependency installation or npm lifecycle step failed.", nextSteps: ["Check the package manager error immediately above the failure.", "Verify package.json and package-lock.json are synchronized when a lockfile is used.", "Reproduce with the same Node.js version as CI."] };
  if (/test failed|failing test|assertionerror|node:test|jest|vitest|playwright/.test(lower)) return { category: "Tests", likelyCause: "A test or assertion failed during CI.", nextSteps: ["Reproduce the failing test locally.", "Inspect the first failing assertion rather than later cascading failures.", "Add or update a regression test when behavior changed."] };
  if (/eslint|lint error|linting/.test(lower)) return { category: "Lint", likelyCause: "The workflow reported a linting violation.", nextSteps: ["Run the repository lint command locally.", "Fix the reported rule violations without changing unrelated code."] };
  if (/permission denied|eacces|enoent|command not found/.test(lower)) return { category: "Environment", likelyCause: "CI could not access a file, command, or required environment capability.", nextSteps: ["Verify the command and path exist in the CI image.", "Check permissions and environment variables used by the failing step.", "Avoid relying on developer-machine-only state."] };
  return { category: "Unknown", likelyCause: "The failure did not match a known diagnostic signature.", nextSteps: ["Inspect the first error in the failed job log.", "Reproduce the failing command locally with the same runtime versions.", "Review recent changes affecting the failed workflow step."] };
}

function extractFailedSteps(log: string): string[] {
  const steps = new Set<string>();
  for (const line of log.split("\n")) {
    const match = line.match(/##\[group\]Run (.+)$/);
    if (match) steps.add(match[1].trim());
  }
  return [...steps];
}

function excerpt(log: string): string {
  const lines = log.split("\n").filter((line) => line.trim());
  const errorIndex = lines.findIndex((line) => /error|failed|failure|fatal|exception|ts\d{4}/i.test(line));
  const start = Math.max(0, errorIndex < 0 ? lines.length - 20 : errorIndex - 4);
  return lines.slice(start, start + 25).join("\n").slice(0, 6000);
}

export async function getRecentWorkflowRuns(limit = 10): Promise<WorkflowRunSummary[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Workflow limit must be an integer from 1 to 50");
  const raw = await gh(["run", "list", "--limit", String(limit), "--json", "databaseId,name,status,conclusion,headBranch,headSha,url,createdAt"]);
  return parseRuns(raw);
}

export async function diagnoseWorkflowRun(runId: number, summary: WorkflowRunSummary | null = null): Promise<WorkflowDiagnosis> {
  validateRunId(runId);
  const log = await gh(["run", "view", String(runId), "--log-failed"]);
  return { runId, summary, failedSteps: extractFailedSteps(log), ...classifyLog(log), logExcerpt: excerpt(log) };
}

export function formatWorkflowRuns(runs: WorkflowRunSummary[]): string {
  if (!runs.length) return "# GitHub Actions\n\nNo workflow runs found.\n";
  const lines = ["# GitHub Actions", "", "| Workflow | Status | Branch | Commit | Created |", "| --- | --- | --- | --- | --- |"];
  for (const run of runs) lines.push(`| ${tableCell(run.name)} | ${tableCell(run.conclusion ?? run.status)} | ${tableCell(run.branch)} | ${tableCell(run.commit.slice(0, 7))} | ${tableCell(run.createdAt)} |`);
  return lines.join("\n") + "\n";
}

export function formatWorkflowDiagnosis(diagnosis: WorkflowDiagnosis): string {
  const summary = diagnosis.summary;
  return [
    `# GitHub Actions Diagnosis #${diagnosis.runId}`,
    "",
    summary ? `- Workflow: ${tableCell(summary.name)}\n- Status: ${tableCell(summary.conclusion ?? summary.status)}\n- Branch: ${tableCell(summary.branch)}\n- Commit: ${tableCell(summary.commit.slice(0, 7))}` : "- Workflow metadata: unavailable",
    `- Category: ${diagnosis.category}`,
    `- Likely cause: ${diagnosis.likelyCause}`,
    "",
    "## Failed steps",
    diagnosis.failedSteps.length ? diagnosis.failedSteps.map((step) => `- ${step}`).join("\n") : "- Not detected from the log",
    "",
    "## Next steps",
    diagnosis.nextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    "",
    "## Untrusted log excerpt",
    "",
    "```text",
    diagnosis.logExcerpt || "No failed-step log output was returned.",
    "```",
    ""
  ].join("\n");
}
