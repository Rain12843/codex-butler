import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function commandVersion(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await exec(command, args, { timeout: 5000, maxBuffer: 128 * 1024 });
    const value = (stdout || stderr).trim().split("\n")[0];
    return value || null;
  } catch { return null; }
}

async function firstCommandVersion(commands: Array<[string, string[]]>): Promise<string | null> {
  for (const [command, args] of commands) {
    const version = await commandVersion(command, args);
    if (version) return version;
  }
  return null;
}

function nodeMajor(version: string): number | null {
  const match = version.match(/v?(\d+)/);
  return match ? Number(match[1]) : null;
}

export async function runChecks(): Promise<CheckResult[]> {
  const checks: Array<[string, Promise<string | null>]> = [
    ["Node.js", commandVersion("node", ["--version"])],
    ["Git", commandVersion("git", ["--version"])],
    ["Codex CLI", commandVersion("codex", ["--version"])],
    ["GitHub CLI", commandVersion("gh", ["--version"])],
    ["Python", firstCommandVersion([["python3", ["--version"]], ["python", ["--version"]]])]
  ];
  const versions = await Promise.all(checks.map(([, promise]) => promise));
  const results: CheckResult[] = checks.map(([name], index) => {
    const version = versions[index];
    const major = name === "Node.js" && version ? nodeMajor(version) : null;
    return {
      name,
      ok: version !== null && (name !== "Node.js" || (major !== null && major >= 20)),
      detail: version === null ? "not found" : major !== null && major < 20 ? `${version} (Node.js 20+ required)` : version
    };
  });
  try {
    await access(`${homedir()}/.codex`);
    results.push({ name: "Codex home", ok: true, detail: "~/.codex exists" });
  } catch {
    results.push({ name: "Codex home", ok: false, detail: "~/.codex not found" });
  }
  return results;
}
