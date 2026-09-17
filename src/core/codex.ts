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

export interface CodexConfigSummary {
  path: string | null;
  present: boolean;
  model: string | null;
  modelProvider: string | null;
  approvalPolicy: string | null;
  sandboxMode: string | null;
  reasoningEffort: string | null;
  mcpServers: string[];
  projectConfigPresent: boolean;
  projectConfigPath: string | null;
  notes: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function command(command: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await exec(command, args, { timeout: 5000 });
    return (stdout || stderr).trim().split("\n")[0] ?? null;
  } catch {
    return null;
  }
}

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

/** Extract a top-level TOML string/bare value without a full parser. */
export function extractTomlValue(text: string, key: string): string | null {
  const re = new RegExp(`(?:^|\n)\s*${key}\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\n#]+))`, "m");
  const match = text.match(re);
  if (!match) return null;
  const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
  return value.length > 0 ? value : null;
}

/** List [mcp_servers.name] table headers from config.toml text. */
export function extractMcpServerNames(text: string): string[] {
  const names: string[] = [];
  const re = /(?:^|\n)\s*\[mcp_servers\.([^\]\s]+)\s*\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const name = match[1]?.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export function summarizeConfigText(text: string, path: string): Omit<CodexConfigSummary, "projectConfigPresent" | "projectConfigPath"> {
  const model = extractTomlValue(text, "model");
  const modelProvider = extractTomlValue(text, "model_provider");
  const approvalPolicy = extractTomlValue(text, "approval_policy");
  const sandboxMode = extractTomlValue(text, "sandbox_mode");
  const reasoningEffort = extractTomlValue(text, "model_reasoning_effort");
  const mcpServers = extractMcpServerNames(text);
  const notes: string[] = [];

  if (approvalPolicy === "never" && sandboxMode === "danger-full-access") {
    notes.push("High-autonomy profile detected (approval_policy=never + sandbox_mode=danger-full-access). Use only in trusted environments.");
  } else if (approvalPolicy === "never") {
    notes.push("approval_policy=never disables interactive approval prompts.");
  }
  if (sandboxMode === "danger-full-access") {
    notes.push("sandbox_mode=danger-full-access grants broad filesystem/network access.");
  }
  if (!model) notes.push("No default model set; Codex will use its built-in default.");
  if (mcpServers.length === 0) notes.push("No [mcp_servers.*] entries found.");

  return {
    path,
    present: true,
    model,
    modelProvider,
    approvalPolicy,
    sandboxMode,
    reasoningEffort,
    mcpServers,
    notes,
  };
}

export async function inspectCodexConfig(root: string): Promise<CodexConfigSummary> {
  const home = homedir();
  const userConfigPath = join(home, ".codex", "config.toml");
  const projectConfigPath = join(root, ".codex", "config.toml");
  const userText = await readText(userConfigPath);
  const projectPresent = await exists(projectConfigPath);

  if (userText === null) {
    return {
      path: null,
      present: false,
      model: null,
      modelProvider: null,
      approvalPolicy: null,
      sandboxMode: null,
      reasoningEffort: null,
      mcpServers: [],
      projectConfigPresent: projectPresent,
      projectConfigPath: projectPresent ? projectConfigPath : null,
      notes: ["~/.codex/config.toml not found. Run Codex once or create the file to set model, sandbox, and approval defaults."],
    };
  }

  const summary = summarizeConfigText(userText, userConfigPath);
  if (projectPresent) {
    summary.notes.push(`Project override present at ${projectConfigPath} (loaded only for trusted projects).`);
  }
  return {
    ...summary,
    projectConfigPresent: projectPresent,
    projectConfigPath: projectPresent ? projectConfigPath : null,
  };
}

export function formatCodexConfigSummary(summary: CodexConfigSummary): string {
  const lines: string[] = ["# Codex configuration summary", ""];
  if (!summary.present) {
    lines.push(`Status: missing`);
    for (const note of summary.notes) lines.push(`- ${note}`);
    return lines.join("\n") + "\n";
  }
  lines.push(`Config: ${summary.path}`);
  lines.push(`Model: ${summary.model ?? "(default)"}`);
  lines.push(`Provider: ${summary.modelProvider ?? "(default)"}`);
  lines.push(`Approval policy: ${summary.approvalPolicy ?? "(default)"}`);
  lines.push(`Sandbox mode: ${summary.sandboxMode ?? "(default)"}`);
  lines.push(`Reasoning effort: ${summary.reasoningEffort ?? "(default)"}`);
  lines.push(`MCP servers: ${summary.mcpServers.length ? summary.mcpServers.join(", ") : "(none)"}`);
  lines.push(`Project .codex/config.toml: ${summary.projectConfigPresent ? summary.projectConfigPath : "not found"}`);
  if (summary.notes.length) {
    lines.push("");
    lines.push("Notes:");
    for (const note of summary.notes) lines.push(`- ${note}`);
  }
  return lines.join("\n") + "\n";
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
  const projectCodexConfig = join(root, ".codex", "config.toml");
  const version = await command("codex", ["--version"]);
  const codexDirExists = await exists(codexDir);
  const configText = await readText(configPath);
  const globalAgentsExists = (await exists(globalAgents)) || (await exists(globalAgentsOverride));
  const projectAgentsExists = (await exists(projectAgents)) || (await exists(projectAgentsOverride));
  const userSkillsExists = await exists(userSkills);
  const projectSkillsExists = await exists(projectSkills);
  const projectCodexConfigExists = await exists(projectCodexConfig);

  const checks: CodexCheck[] = [
    { name: "Codex CLI", status: version ? "ok" : "missing", detail: version ?? "codex command not found" },
    { name: "~/.codex", status: codexDirExists ? "ok" : "warning", detail: codexDirExists ? codexDir : "directory not found" },
    {
      name: "Codex config",
      status: configText !== null ? "ok" : "warning",
      detail: configText !== null ? configPath : `config.toml not found or unreadable under ${codexDir}`,
    },
  ];

  if (configText !== null) {
    const summary = summarizeConfigText(configText, configPath);
    checks.push({
      name: "Default model",
      status: summary.model ? "ok" : "warning",
      detail: summary.model ?? "not set (Codex built-in default will be used)",
    });
    checks.push({
      name: "Approval policy",
      status: summary.approvalPolicy === "never" ? "warning" : "ok",
      detail: summary.approvalPolicy ?? "not set (Codex default)",
    });
    checks.push({
      name: "Sandbox mode",
      status: summary.sandboxMode === "danger-full-access" ? "warning" : "ok",
      detail: summary.sandboxMode ?? "not set (Codex default)",
    });
    checks.push({
      name: "MCP servers",
      status: summary.mcpServers.length ? "ok" : "warning",
      detail: summary.mcpServers.length ? summary.mcpServers.join(", ") : "no [mcp_servers.*] entries detected",
    });
  } else {
    checks.push({ name: "MCP configuration", status: "warning", detail: "no config.toml to inspect for MCP servers" });
  }

  checks.push(
    {
      name: "Global AGENTS.md",
      status: globalAgentsExists ? "ok" : "warning",
      detail: globalAgentsExists ? `${globalAgents} or ${globalAgentsOverride}` : "not found under ~/.codex",
    },
    {
      name: "Project AGENTS.md",
      status: projectAgentsExists ? "ok" : "warning",
      detail: projectAgentsExists ? `${projectAgents} or ${projectAgentsOverride}` : "not found; run codex-butler init",
    },
    {
      name: "User skills",
      status: userSkillsExists ? "ok" : "warning",
      detail: userSkillsExists ? userSkills : "not found; run codex-butler skills install <name>",
    },
    {
      name: "Project skills",
      status: projectSkillsExists ? "ok" : "warning",
      detail: projectSkillsExists ? projectSkills : "not found",
    },
    {
      name: "Project .codex/config.toml",
      status: projectCodexConfigExists ? "ok" : "warning",
      detail: projectCodexConfigExists ? projectCodexConfig : "not found (optional project override)",
    }
  );

  return checks;
}
