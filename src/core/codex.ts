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
  const configPath = configCandidates.find((path) => path);
  const configExists = await Promise.all(configCandidates.map(exists));
  const agents = [join(home, "AGENTS.md"), join(root, "AGENTS.md")];
  const mcpCandidates = [join(codexDir, "config.toml"), join(codexDir, "mcp.json"), join(root, ".codex", "mcp.json")];
  const mcpExists = await Promise.all(mcpCandidates.map(exists));
  const version = await command("codex", ["--version"]);

  const checks: CodexCheck[] = [
    { name: "Codex CLI", status: version ? "ok" : "missing", detail: version ?? "codex command not found" },
    { name: "~/.codex", status: await exists(codexDir) ? "ok" : "warning", detail: await exists(codexDir) ? codexDir : "directory not found" },
    { name: "Codex config", status: configExists.some(Boolean) ? "ok" : "warning", detail: configExists.some(Boolean) ? "configuration file found" : `no config file found under ${codexDir}` },
    { name: "Global AGENTS.md", status: await exists(agents[0]) ? "ok" : "warning", detail: await exists(agents[0]) ? agents[0] : "not found" },
    { name: "Project AGENTS.md", status: await exists(agents[1]) ? "ok" : "warning", detail: await exists(agents[1]) ? agents[1] : "not found; run codex-butler init" },
    { name: "MCP configuration", status: mcpExists.some(Boolean) ? "ok" : "warning", detail: mcpExists.some(Boolean) ? "configuration candidate found" : "no common MCP configuration file found" }
  ];

  if (configPath && configExists.some(Boolean)) {
    try { await readFile(configCandidates[configExists.findIndex(Boolean)], "utf8"); }
    catch { checks[2] = { name: "Codex config", status: "warning", detail: "configuration exists but could not be read" }; }
  }
  return checks;
}
