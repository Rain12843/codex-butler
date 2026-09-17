import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

export interface CodexCheck {
  name: string;
  status: "ok" | "warning" | "missing";
  detail: string;
}

async function exists(path: string): Promise<boolean> {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

async function command(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await exec(command, args, { timeout: 5000 });
    return (stdout || stderr).trim().split("\n")[0] ?? null;
  } catch { return null; }
}

export async function inspectCodex(root: string): Promise<CodexCheck[]> {
  const home = homedir();
  const codexDir = join(home, ".codex");
  const configCandidates = [join(codexDir, "config.toml"), join(codexDir, "config.json")];
  const configExists = await Promise.all(configCandidates.map(exists));
  const configIndex = configExists.findIndex(Boolean);
  const configPath = configIndex >= 0 ? configCandidates[configIndex] : undefined;
  const agents = [join(home, "AGENTS.md"), join(root, "AGENTS.md")];
  const mcpCandidates = [join(codexDir, "config.toml"), join(codexDir, "mcp.json"), join(root, ".codex", "mcp.json")];
  const mcpExists = await Promise.all(mcpCandidates.map(exists));
  const version = await command("codex", ["--version"]);
  const codexDirExists = await exists(codexDir);
  const globalAgentsExists = await exists(agents[0]);
  const projectAgentsExists = await exists(agents[1]);

  const checks: CodexCheck[] = [
    { name: "Codex CLI", status: version ? "ok" : "missing", detail: version ?? "codex command not found" },
    { name: "~/.codex", status: codexDirExists ? "ok" : "warning", detail: codexDirExists ? codexDir : "directory not found" },
    { name: "Codex config", status: configPath ? "ok" : "warning", detail: configPath ? configPath : `no supported config candidate found under ${codexDir}` },
    { name: "Global AGENTS.md", status: globalAgentsExists ? "ok" : "warning", detail: globalAgentsExists ? agents[0] : "not found" },
    { name: "Project AGENTS.md", status: projectAgentsExists ? "ok" : "warning", detail: projectAgentsExists ? agents[1] : "not found; run codex-butler init" },
    { name: "MCP configuration", status: mcpExists.some(Boolean) ? "ok" : "warning", detail: mcpExists.some(Boolean) ? "candidate configuration found" : "no common MCP configuration candidate found" }
  ];

  if (configPath) {
    try { await readFile(configPath, "utf8"); }
    catch { checks[2] = { name: "Codex config", status: "warning", detail: `${configPath} exists but could not be read` }; }
  }
  return checks;
}
