#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runChecks } from "./core/checks.js";
import { analyzeProject, generateAgents } from "./core/project.js";
import { initMemory } from "./core/memory.js";
import { formatSkills, getSkillPath, getSkillsPath, installSkill, listInstalledSkills, removeSkill } from "./core/skills.js";
import { ensureConfig, getConfigPath, loadConfig, saveConfig, isButlerMode } from "./core/config.js";
import { inspectCodex } from "./core/codex.js";
import { auditSkillDirectory } from "./core/skill-audit.js";
import { formatTaskPlan, planTask } from "./core/planner.js";
import { formatGitHubContext, getIssueContext, getPullRequestContext } from "./core/github.js";
import { formatWorkflowRuns, getRecentWorkflowRuns } from "./core/ci.js";

const program = new Command();
program.name("codex-butler").description("A productivity and diagnostics layer for OpenAI Codex").version("0.5.0");

program.command("doctor").description("Diagnose the local Codex development environment").action(async () => {
  console.log(pc.bold("Codex Butler Doctor"));
  for (const result of await runChecks()) {
    const icon = result.ok ? pc.green("✓") : pc.red("✗");
    console.log(`${icon} ${result.name}: ${result.detail}`);
  }
  console.log();
  for (const result of await inspectCodex(process.cwd())) {
    const icon = result.status === "ok" ? pc.green("✓") : result.status === "warning" ? pc.yellow("!") : pc.red("✗");
    console.log(`${icon} ${result.name}: ${result.detail}`);
  }
});

program.command("setup").description("Initialize Butler configuration and show the setup checklist").action(async () => {
  const config = await ensureConfig();
  console.log(pc.bold("Codex Butler Setup"));
  console.log(pc.green(`✓ Configuration ready: ${getConfigPath()}`));
  console.log(`Default mode: ${config.defaultMode}`);
  console.log("\nNext steps:");
  console.log("1. Install Codex and authenticate.");
  console.log("2. Run: codex-butler doctor");
  console.log("3. In a project, run: codex-butler init");
  console.log("4. Install reusable skills with: codex-butler skills install <name>");
});

program.command("init").description("Analyze the current project and create AGENTS.md plus project memory").option("--force", "overwrite an existing AGENTS.md").action(async (options: { force?: boolean }) => {
  const project = await analyzeProject(process.cwd());
  const output = generateAgents(project);
  const { existsSync } = await import("node:fs");
  const { writeFile } = await import("node:fs/promises");
  const target = `${process.cwd()}/AGENTS.md`;
  if (existsSync(target) && !options.force) {
    console.error(pc.red("AGENTS.md already exists. Use --force to replace it."));
    process.exitCode = 1;
    return;
  }
  await writeFile(target, output, "utf8");
  const created = await initMemory(process.cwd());
  console.log(pc.green(`✓ Created ${target}`));
  console.log(pc.green(`✓ Initialized project memory (${created.length} files)`));
  console.log(pc.dim(`Detected ${project.files.length} files and ${project.directories.length} directories.`));
});

program.command("plan <task>").description("Turn a plain-language task into a deterministic Codex work plan").action((task: string) => {
  try { console.log(formatTaskPlan(planTask(task))); }
  catch (error) { console.error(pc.red(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
});

const github = program.command("github").description("Inspect GitHub context through the local GitHub CLI");
github.command("issue <number>").description("Show an issue as structured context").action(async (number: string) => {
  try { console.log(formatGitHubContext(await getIssueContext(Number(number)))); }
  catch (error) { console.error(pc.red(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
});
github.command("pr <number>").description("Show a pull request as structured context").action(async (number: string) => {
  try { console.log(formatGitHubContext(await getPullRequestContext(Number(number)))); }
  catch (error) { console.error(pc.red(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
});
github.command("ci").description("Show recent GitHub Actions workflow runs").option("-n, --limit <number>", "number of runs to inspect", "10").action(async (options: { limit: string }) => {
  try { console.log(formatWorkflowRuns(await getRecentWorkflowRuns(Number(options.limit)))); }
  catch (error) { console.error(pc.red(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
});

const skills = program.command("skills").description("Manage reusable Codex Butler skills");
skills.command("list").description("List available and installed skills").action(async () => {
  console.log(pc.bold("Available skills"));
  console.log(formatSkills());
  const installed = await listInstalledSkills();
  console.log(pc.bold("\nInstalled skills"));
  console.log(installed.length ? installed.map((name) => `- ${name}`).join("\n") : "- none");
});
skills.command("path").description("Show the local skill directory").action(() => console.log(getSkillsPath()));
skills.command("install <name>").description("Install a built-in skill locally").option("--force", "replace an existing skill").action(async (name: string, options: { force?: boolean }) => {
  try { console.log(pc.green(`✓ Installed ${name}: ${await installSkill(name, options.force === true)}`)); }
  catch (error) { console.error(pc.red(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
});
skills.command("remove <name>").description("Remove an installed skill").action(async (name: string) => {
  try { await removeSkill(name); console.log(pc.green(`✓ Removed ${name}`)); }
  catch (error) { console.error(pc.red(error instanceof Error ? error.message : String(error))); process.exitCode = 1; }
});
skills.command("audit <name>").description("Audit an installed skill for risky instructions").action(async (name: string) => {
  try {
    const findings = await auditSkillDirectory(getSkillPath(name));
    if (!findings.length) { console.log(pc.green("✓ No known risky patterns found.")); return; }
    for (const finding of findings) console.log(`${finding.severity === "high" ? pc.red("✗") : pc.yellow("!")} ${finding.detail}`);
    process.exitCode = findings.some((finding) => finding.severity === "high") ? 2 : 0;
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});
skills.action(async () => { console.log(pc.bold("Codex Butler Skills")); console.log(formatSkills()); });

const config = program.command("config").description("Manage Butler configuration");
config.command("show").description("Show the current configuration").action(async () => console.log(JSON.stringify(await loadConfig(), null, 2)));
config.command("init").description("Create the default configuration").action(async () => { await ensureConfig(); console.log(pc.green(`✓ Configuration ready: ${getConfigPath()}`)); });
config.command("mode <mode>").description("Set the default operating mode").action(async (mode: string) => {
  if (!isButlerMode(mode)) { console.error(pc.red(`Invalid mode: ${mode}`)); process.exitCode = 1; return; }
  const current = await loadConfig();
  await saveConfig({ ...current, defaultMode: mode });
  console.log(pc.green(`✓ Default mode set to ${mode}`));
});
config.action(async () => console.log(JSON.stringify(await loadConfig(), null, 2)));

await program.parseAsync();
