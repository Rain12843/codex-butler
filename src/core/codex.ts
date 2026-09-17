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

async function readText(path: string): Promise<string | null> {
  try { return await readFile(path, "utf8"); } catch { return null; }
}

export async function inspectCodex(root: string): Promise<CodexCheck[]> {
  const home = homedir();
  const codexDir = join(home, ".codex");
  const configPath = join(codexDir, "config.toml");
  const globalAgents = join(codexDir, "AGENTS.md");
  const globalAgentsOverride = join(codexDir, "AGENTS.override.md");
  const projectAgents = join(root, "AGENTS.md");
  const projectAgentsOverride = join(root, "AGENTS.override.md");
  const userSkills = join(home, ".agents", "skills");
  const projectSkills = join(root, ".agents", "skills");
  const version = await command("codex", ["--version"]);
  const codexDirExists = await exists(codexDir);
  const configText = await readText(configPath);
  const globalAgentsExists = (await exists(globalAgents)) || (await exists(globalAgentsOverride));
  const projectAgentsExists = (await exists(projectAgents)) || (await exists(projectAgentsOverride));
  const userSkillsExists = await exists(userSkills);
  const projectSkillsExists = await exists(projectSkills);
  const mcpToml = configText !== null && /(^|\n)\s*\[mcp_servers(?:\.|\])/m.test(configText);

  return [
    { name: "Codex CLI", status: version ? "ok" : "missing", detail: version ?? "codex command not found" },
    { name: "~/.codex", status: codexDirExists ? "ok" : "warning", detail: codexDirExists ? codexDir : "directory not found" },
    { name: "Codex config", status: configText !== null ? "ok" : "warning", detail: configText !== null ? configPath : `config.toml not found or unreadable under ${codexDir}` },
    { name: "Global AGENTS.md", status: globalAgentsExists ? "ok" : "warning", detail: globalAgentsExists ? `${globalAgents} or ${globalAgentsOverride}` : "not found under ~/.codex" },
    { name: "Project AGENTS.md", status: projectAgentsExists ? "ok" : "warning", detail: projectAgentsExists ? `${projectAgents} or ${projectAgentsOverride}` : "not found; run codex-butler init" },
    { name: "User skills", status: userSkillsExists ? "ok" : "warning", detail: userSkillsExists ? userSkills : "not found; run codex-butler skills install <name>" },
    { name: "Project skills", status: projectSkillsExists ? "ok" : "warning", detail: projectSkillsExists ? projectSkills : "not found" },
    { name: "MCP configuration", status: mcpToml ? "ok" : "warning", detail: mcpToml ? "MCP server entries detected in ~/.codex/config.toml" : "no [mcp_servers.*] entries detected in config.toml" }
  ];
}
