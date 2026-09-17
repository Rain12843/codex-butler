import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function commandVersion(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await exec(command, args, { timeout: 5000 });
    return stdout.trim().split("\n")[0] ?? null;
  } catch {
    return null;
  }
}

export async function runChecks(): Promise<CheckResult[]> {
  const checks: Array<[string, string, string[]]> = [
    ["Node.js", "node", ["--version"]],
    ["Git", "git", ["--version"]],
    ["Codex CLI", "codex", ["--version"]],
    ["GitHub CLI", "gh", ["--version"]],
    ["Python", "python3", ["--version"]]
  ];

  const results: CheckResult[] = [];
  for (const [name, command, args] of checks) {
    const version = await commandVersion(command, args);
    results.push({
      name,
      ok: version !== null,
      detail: version ?? "not found"
    });
  }
  return results;
}
