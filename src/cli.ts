#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runChecks } from "./core/checks.js";
import { analyzeProject, generateAgents } from "./core/project.js";
import { initMemory } from "./core/memory.js";
import { formatSkills } from "./core/skills.js";

const program = new Command();

program.name("codex-butler").description("A productivity and diagnostics layer for OpenAI Codex").version("0.1.0");

program.command("doctor").description("Diagnose the local Codex development environment").action(async () => {
  console.log(pc.bold("Codex Butler Doctor"));
  const results = await runChecks();
  for (const result of results) {
    const icon = result.ok ? pc.green("✓") : pc.red("✗");
    console.log(`${icon} ${result.name}: ${result.detail}`);
  }
});

program.command("setup").description("Show the recommended first-time setup checklist").action(() => {
  console.log(pc.bold("Codex Butler Setup"));
  console.log("1. Install Codex and authenticate.");
  console.log("2. Install Git and Node.js 20+.");
  console.log("3. Run: codex-butler doctor");
  console.log("4. In a project, run: codex-butler init");
  console.log("5. Review AGENTS.md and .codex-butler/ before committing them.");
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
});

program.command("skills").description("List the built-in skill catalog").action(() => {
  console.log(pc.bold("Codex Butler Skills"));
  console.log(formatSkills());
});

program.command("config").description("Show configuration and project-memory locations").action(() => {
  console.log("User config: ~/.codex-butler/config.json");
  console.log("Project memory: .codex-butler/");
  console.log("Codex instructions: AGENTS.md");
});

await program.parseAsync();
