#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { runChecks } from "./core/checks.js";
import { analyzeProject, generateAgents } from "./core/project.js";
import { ensureButlerGitignore, initMemory } from "./core/memory.js";
import {
  formatSkillsWithStatus,
  getSkillPath,
  getSkillsPath,
  importSkillDirectory,
  installAllSkills,
  installSkill,
  listInstalledSkills,
  removeSkill,
  showSkill,
} from "./core/skills.js";
import { ensureConfig, getConfigPath, loadConfig, saveConfig, isButlerMode } from "./core/config.js";
import { formatCodexConfigSummary, inspectCodex, inspectCodexConfig } from "./core/codex.js";
import { auditSkillDirectory } from "./core/skill-audit.js";
import { formatCodexPrompt, formatTaskPlan, planGitHubContext, planTask } from "./core/planner.js";
import {
  formatGitHubContext,
  getIssueContext,
  getPullRequestContext,
  analyzePullRequestDiff,
  formatPullRequestDiffAnalysis,
} from "./core/github.js";
import {
  diagnoseWorkflowRun,
  formatWorkflowDiagnosis,
  formatWorkflowRuns,
  getRecentWorkflowRuns,
  getWorkflowRunSummary,
} from "./core/ci.js";
import { formatPullRequestReview, reviewPullRequest } from "./core/pr-review.js";

const program = new Command();
program
  .name("codex-butler")
  .description("A productivity and diagnostics layer for OpenAI Codex")
  .version("0.8.2");

function parsePositiveInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

program
  .command("doctor")
  .description("Diagnose the local Codex development environment")
  .option("--json", "emit machine-readable JSON")
  .action(async (options: { json?: boolean }) => {
    const checks = await runChecks();
    const codexChecks = await inspectCodex(process.cwd());
    const criticalFailed = checks.some((c) => !c.ok && (c.name === "Node.js" || c.name === "Codex CLI"));
    const codexMissing = codexChecks.some((c) => c.name === "Codex CLI" && c.status === "missing");
    const ok = !(criticalFailed || codexMissing);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ok,
            environment: checks,
            codex: codexChecks,
          },
          null,
          2
        )
      );
    } else {
      console.log(pc.bold("Codex Butler Doctor"));
      for (const result of checks) {
        const icon = result.ok ? pc.green("✓") : pc.red("✗");
        console.log(`${icon} ${result.name}: ${result.detail}`);
      }
      console.log();
      for (const result of codexChecks) {
        const icon = result.status === "ok" ? pc.green("✓") : result.status === "warning" ? pc.yellow("!") : pc.red("✗");
        console.log(`${icon} ${result.name}: ${result.detail}`);
      }
    }
    if (!ok) process.exitCode = 1;
  });

program
  .command("codex-config")
  .description("Summarize ~/.codex/config.toml (model, sandbox, approval, MCP)")
  .option("--json", "emit machine-readable JSON")
  .action(async (options: { json?: boolean }) => {
    try {
      const summary = await inspectCodexConfig(process.cwd());
      if (options.json) console.log(JSON.stringify(summary, null, 2));
      else console.log(formatCodexConfigSummary(summary));
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
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

program
  .command("init")
  .description("Analyze the current project and create AGENTS.md plus project memory")
  .option("--force", "overwrite an existing AGENTS.md")
  .action(async (options: { force?: boolean }) => {
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
    const gitignoreUpdated = await ensureButlerGitignore(process.cwd());
    console.log(pc.green(`✓ Created ${target}`));
    console.log(pc.green(`✓ Initialized project memory (${created.length} new files)`));
    if (gitignoreUpdated) console.log(pc.green("✓ Ensured .codex-butler/ is listed in .gitignore"));
    console.log(pc.dim(`Detected ${project.files.length} files and ${project.directories.length} directories.`));
    if (project.truncated) {
      console.log(pc.yellow("! Project scan was truncated (file or depth limit). AGENTS.md still covers the sampled tree."));
    }
  });

program.command("status").description("Show a compact environment, config, and project readiness summary").action(async () => {
  const config = await loadConfig();
  console.log(pc.bold("Codex Butler Status"));
  console.log(`Mode: ${config.defaultMode}`);
  console.log(`Config: ${getConfigPath()}`);
  console.log();
  console.log(pc.bold("Environment"));
  for (const result of await runChecks()) {
    const icon = result.ok ? pc.green("✓") : pc.red("✗");
    console.log(`${icon} ${result.name}: ${result.detail}`);
  }
  console.log();
  console.log(pc.bold("Codex readiness"));
  for (const result of await inspectCodex(process.cwd())) {
    const icon = result.status === "ok" ? pc.green("✓") : result.status === "warning" ? pc.yellow("!") : pc.red("✗");
    console.log(`${icon} ${result.name}: ${result.detail}`);
  }
});

program
  .command("plan <task>")
  .description("Turn a plain-language task into a deterministic Codex work plan")
  .option("--json", "emit the plan as JSON")
  .option("--prompt", "emit a compact prompt ready to paste into Codex")
  .action((task: string, options: { json?: boolean; prompt?: boolean }) => {
    try {
      const plan = planTask(task);
      if (options.json) console.log(JSON.stringify(plan, null, 2));
      else if (options.prompt) console.log(formatCodexPrompt(plan));
      else console.log(formatTaskPlan(plan));
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

const github = program.command("github").description("Inspect GitHub context through the local GitHub CLI");
github.command("issue <number>").description("Show an issue as structured context").action(async (number: string) => {
  try {
    console.log(formatGitHubContext(await getIssueContext(parsePositiveInteger(number, "Issue number"))));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});
github
  .command("issue-plan <number>")
  .description("Turn a GitHub issue into a deterministic work plan")
  .option("--json", "emit the plan as JSON")
  .option("--prompt", "emit a compact prompt ready to paste into Codex")
  .action(async (number: string, options: { json?: boolean; prompt?: boolean }) => {
    try {
      const plan = planGitHubContext(await getIssueContext(parsePositiveInteger(number, "Issue number")));
      if (options.json) console.log(JSON.stringify(plan, null, 2));
      else if (options.prompt) console.log(formatCodexPrompt(plan));
      else console.log(formatTaskPlan(plan));
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });
github.command("pr <number>").description("Show a pull request as structured context").action(async (number: string) => {
  try {
    console.log(formatGitHubContext(await getPullRequestContext(parsePositiveInteger(number, "Pull request number"))));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});
github
  .command("pr-plan <number>")
  .description("Turn a GitHub pull request into a deterministic review plan")
  .option("--json", "emit the plan as JSON")
  .option("--prompt", "emit a compact prompt ready to paste into Codex")
  .action(async (number: string, options: { json?: boolean; prompt?: boolean }) => {
    try {
      const plan = planGitHubContext(await getPullRequestContext(parsePositiveInteger(number, "Pull request number")));
      if (options.json) console.log(JSON.stringify(plan, null, 2));
      else if (options.prompt) console.log(formatCodexPrompt(plan));
      else console.log(formatTaskPlan(plan));
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });
github.command("pr-diff <number>").description("Analyze a pull request diff for change scope and risky patterns").action(async (number: string) => {
  try {
    console.log(formatPullRequestDiffAnalysis(await analyzePullRequestDiff(parsePositiveInteger(number, "Pull request number"))));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});
github.command("pr-review <number>").description("Run deterministic review checks against a pull request diff").action(async (number: string) => {
  try {
    console.log(formatPullRequestReview(await reviewPullRequest(parsePositiveInteger(number, "Pull request number"))));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});

async function listRuns(options: { limit: string }) {
  try {
    console.log(formatWorkflowRuns(await getRecentWorkflowRuns(parsePositiveInteger(options.limit, "Workflow limit"))));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}

github
  .command("ci")
  .description("Show recent GitHub Actions workflow runs")
  .option("-n, --limit <number>", "number of runs to inspect", "10")
  .action(listRuns);
github
  .command("runs")
  .description("Alias for github ci — list recent workflow runs")
  .option("-n, --limit <number>", "number of runs to inspect", "10")
  .action(listRuns);

github.command("ci-diagnose [runId]").description("Diagnose a failed GitHub Actions run from its failed-step logs").action(async (runId?: string) => {
  try {
    let selectedId: number;
    let summary = null;
    if (runId !== undefined) {
      selectedId = parsePositiveInteger(runId, "Workflow run ID");
      summary = await getWorkflowRunSummary(selectedId);
    } else {
      const runs = await getRecentWorkflowRuns(10);
      const failed = runs.find((run) => run.conclusion === "failure");
      if (!failed) {
        throw new Error("No failed workflow run found in the last 10 runs. Pass a run ID explicitly to diagnose a specific run.");
      }
      selectedId = failed.databaseId;
      summary = failed;
    }
    console.log(formatWorkflowDiagnosis(await diagnoseWorkflowRun(selectedId, summary)));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});

const skills = program.command("skills").description("Manage reusable Codex Butler skills");

const builtInNameSet = new Set([
  "frontend", "backend", "database", "testing", "security", "refactoring",
  "git", "github", "docker", "python", "react", "flutter", "devops",
]);

async function printSkillsList() {
  const installed = await listInstalledSkills();
  console.log(pc.bold("Built-in skills"));
  console.log(formatSkillsWithStatus(installed));
  const custom = installed.filter((name) => !builtInNameSet.has(name));
  console.log(pc.bold("\nInstalled (all)"));
  console.log(installed.length ? installed.map((name) => `- ${name}`).join("\n") : "- none");
  if (custom.length) {
    console.log(pc.bold("\nCustom / imported"));
    console.log(custom.map((name) => `- ${name}`).join("\n"));
  }
}

skills.command("list").description("List available and installed skills").action(async () => {
  await printSkillsList();
});
skills.command("path").description("Show the local skill directory").action(() => console.log(getSkillsPath()));
skills.command("show <name>").description("Preview a built-in or installed skill").action(async (name: string) => {
  try {
    console.log(await showSkill(name));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});
skills
  .command("install <name>")
  .description("Install a built-in skill locally")
  .option("--force", "replace an existing skill")
  .action(async (name: string, options: { force?: boolean }) => {
    try {
      console.log(pc.green(`✓ Installed ${name}: ${await installSkill(name, options.force === true)}`));
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });
skills
  .command("install-all")
  .description("Install every built-in skill")
  .option("--force", "replace existing skills")
  .action(async (options: { force?: boolean }) => {
    try {
      const installed = await installAllSkills(options.force === true);
      console.log(pc.green(`✓ Installed ${installed.length} skill(s)`));
      for (const path of installed) console.log(pc.dim(`  ${path}`));
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });
skills
  .command("import <path>")
  .description("Import a local skill directory containing SKILL.md")
  .option("--name <name>", "target skill name (defaults to directory basename)")
  .option("--force", "replace an existing skill")
  .action(async (path: string, options: { name?: string; force?: boolean }) => {
    try {
      const target = options.name
        ? await importSkillDirectory(path, options.name, options.force === true)
        : await importSkillDirectory(path, options.force === true);
      console.log(pc.green(`✓ Imported skill: ${target}`));
    } catch (error) {
      console.error(pc.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });
skills.command("remove <name>").description("Remove an installed skill").action(async (name: string) => {
  try {
    await removeSkill(name);
    console.log(pc.green(`✓ Removed ${name}`));
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});
skills.command("audit <name>").description("Audit an installed skill for risky instructions").action(async (name: string) => {
  try {
    const findings = await auditSkillDirectory(getSkillPath(name));
    if (!findings.length) {
      console.log(pc.green("✓ No known risky patterns found."));
      return;
    }
    for (const finding of findings) {
      console.log(`${finding.severity === "high" ? pc.red("✗") : pc.yellow("!")} ${finding.detail}`);
    }
    process.exitCode = findings.some((finding) => finding.severity === "high") ? 2 : 0;
  } catch (error) {
    console.error(pc.red(error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
});
skills.action(async () => {
  await printSkillsList();
});

const config = program.command("config").description("Manage Butler configuration");
config.command("show").description("Show the current configuration").action(async () => {
  console.log(JSON.stringify(await loadConfig(), null, 2));
});
config.command("init").description("Create the default configuration").action(async () => {
  await ensureConfig();
  console.log(pc.green(`✓ Configuration ready: ${getConfigPath()}`));
});
config.command("mode <mode>").description("Set the default operating mode").action(async (mode: string) => {
  if (!isButlerMode(mode)) {
    console.error(pc.red(`Invalid mode: ${mode}`));
    process.exitCode = 1;
    return;
  }
  const current = await loadConfig();
  await saveConfig({ ...current, defaultMode: mode });
  console.log(pc.green(`✓ Default mode set to ${mode}`));
});
config.action(async () => {
  console.log(JSON.stringify(await loadConfig(), null, 2));
});

await program.parseAsync();
