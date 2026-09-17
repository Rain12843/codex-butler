import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type SkillCategory = "frontend" | "backend" | "database" | "testing" | "security" | "refactoring" | "git" | "github" | "docker" | "python" | "react" | "flutter" | "devops";

export interface SkillDefinition {
  name: SkillCategory;
  description: string;
}

export const builtInSkills: SkillDefinition[] = [
  { name: "frontend", description: "Frontend architecture, UI implementation, and accessibility" },
  { name: "backend", description: "API, service, and server-side development" },
  { name: "database", description: "Schema design, queries, migrations, and data safety" },
  { name: "testing", description: "Unit, integration, regression, and test strategy" },
  { name: "security", description: "Secure coding, dependency review, and threat awareness" },
  { name: "refactoring", description: "Safe incremental refactoring and technical debt reduction" },
  { name: "git", description: "Commits, branches, diffs, rebases, and repository hygiene" },
  { name: "github", description: "Issues, pull requests, reviews, and GitHub workflows" },
  { name: "docker", description: "Containerization, images, compose, and reproducible environments" },
  { name: "python", description: "Python application structure, tooling, and testing" },
  { name: "react", description: "React component design, state, hooks, and performance" },
  { name: "flutter", description: "Flutter widgets, state, navigation, and platform integration" },
  { name: "devops", description: "CI/CD, deployment, observability, and infrastructure workflows" }
];

const skillTemplate = (skill: SkillDefinition) => `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n# ${skill.name} skill\n\n## Goal\nApply the ${skill.name} workflow consistently while preserving the repository's existing conventions.\n\n## Rules\n- Inspect the relevant code before changing it.\n- Prefer small, reviewable changes.\n- Run the narrowest useful validation after edits.\n- Do not expose secrets or modify unrelated files.\n`;

export function getSkillsPath(): string {
  return join(homedir(), ".codex-butler", "skills");
}

export async function listInstalledSkills(): Promise<string[]> {
  try {
    return (await readdir(getSkillsPath(), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch { return []; }
}

export async function installSkill(name: string): Promise<string> {
  const skill = builtInSkills.find((item) => item.name === name);
  if (!skill) throw new Error(`Unknown built-in skill: ${name}`);
  const target = join(getSkillsPath(), name);
  await mkdir(target, { recursive: true });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(join(target, "SKILL.md"), skillTemplate(skill), "utf8");
  return target;
}

export async function removeSkill(name: string): Promise<void> {
  const base = resolve(getSkillsPath());
  const target = resolve(base, name);
  if (target !== join(base, name)) throw new Error("Invalid skill path");
  await rm(target, { recursive: true, force: true });
}

export async function importSkillDirectory(source: string): Promise<string> {
  const sourcePath = resolve(source);
  const marker = join(sourcePath, "SKILL.md");
  try { await access(marker, constants.R_OK); } catch { throw new Error("Source directory must contain SKILL.md"); }
  const name = sourcePath.split(/[\\/]/).pop();
  if (!name) throw new Error("Invalid skill directory");
  const target = join(getSkillsPath(), name);
  await mkdir(getSkillsPath(), { recursive: true });
  await cp(sourcePath, target, { recursive: true });
  return target;
}

export function formatSkills(): string {
  return builtInSkills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");
}
