import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function commandVersion(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await exec(command, args, { timeout: 5000 });
    return (stdout || stderr).trim().split("\n")[0] ?? null;
  } catch { return null; }
}

function nodeMajor(version: string): number | null {
  const match = version.match(/v?(\d+)/);
  return match ? Number(match[1]) : null;
}

export async function runChecks(): Promise<CheckResult[]> {
  const commands: Array<[string, string, string[]]> = [
    ["Node.js", "node", ["--version"]],
    ["Git", "git", ["--version"]],
    ["Codex CLI", "codex", ["--version"]],
    ["GitHub CLI", "gh", ["--version"]],
    ["Python", "python3", ["--version"]]
  ];
  const results: CheckResult[] = [];
  for (const [name, command, args] of commands) {
    const version = await commandVersion(command, args);
    const major = name === "Node.js" && version ? nodeMajor(version) : null;
    results.push({
      name,
      ok: version !== null && (name !== "Node.js" || (major !== null && major >= 20)),
      detail: version === null ? "not found" : major !== null && major < 20 ? `${version} (Node.js 20+ required)` : version
    });
  }
  try {
    await access(`${process.env.HOME ?? process.env.USERPROFILE ?? ""}/.codex`);
    results.push({ name: "Codex home", ok: true, detail: "~/.codex exists" });
  } catch {
    results.push({ name: "Codex home", ok: false, detail: "~/.codex not found" });
  }
  return results;
}
