import { access, copyFile, lstat, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

export type SkillCategory = "frontend" | "backend" | "database" | "testing" | "security" | "refactoring" | "git" | "github" | "docker" | "python" | "react" | "flutter" | "devops";

export interface SkillDefinition { name: SkillCategory; description: string; }

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

const MAX_SKILL_FILES = 64;
const MAX_SKILL_FILE_BYTES = 256 * 1024;
const MAX_SKILL_TOTAL_BYTES = 1024 * 1024;

function assertSafeName(name: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) throw new Error("Invalid skill name");
}

export function getSkillsPath(): string { return join(homedir(), ".codex-butler", "skills"); }

export function getSkillPath(name: string): string {
  assertSafeName(name);
  return join(getSkillsPath(), name);
}

export async function listInstalledSkills(): Promise<string[]> {
  try { return (await readdir(getSkillsPath(), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(); }
  catch { return []; }
}

export async function installSkill(name: string, force = false): Promise<string> {
  assertSafeName(name);
  const skill = builtInSkills.find((item) => item.name === name);
  if (!skill) throw new Error(`Unknown built-in skill: ${name}`);
  const target = getSkillPath(name);
  await mkdir(getSkillsPath(), { recursive: true });
  if (!force) {
    try { await access(join(target, "SKILL.md"), constants.F_OK); throw new Error(`Skill already installed: ${name}. Use --force to replace it.`); }
    catch (error) { if (error instanceof Error && error.message.startsWith("Skill already installed:")) throw error; }
  }
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "SKILL.md"), skillTemplate(skill), "utf8");
  return target;
}

export async function removeSkill(name: string): Promise<void> {
  const base = resolve(getSkillsPath());
  const target = resolve(getSkillPath(name));
  if (relative(base, target).startsWith("..") || target === base) throw new Error("Invalid skill path");
  await rm(target, { recursive: true, force: true });
}

interface SkillFile {
  relativePath: string;
  size: number;
}

export async function validateSkillTree(source: string): Promise<SkillFile[]> {
  const sourcePath = resolve(source);
  const rootStat = await lstat(sourcePath);
  if (!rootStat.isDirectory()) throw new Error("Skill source must be a directory");

  const files: SkillFile[] = [];
  let totalBytes = 0;

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Skill source cannot contain symlinks: ${relative(sourcePath, path)}`);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      if (!entry.isFile()) throw new Error(`Unsupported skill source entry: ${relative(sourcePath, path)}`);
      const fileStat = await lstat(path);
      if (!fileStat.isFile()) throw new Error(`Skill source entry changed during validation: ${relative(sourcePath, path)}`);
      if (fileStat.size > MAX_SKILL_FILE_BYTES) throw new Error(`Skill file exceeds ${MAX_SKILL_FILE_BYTES} bytes: ${relative(sourcePath, path)}`);
      totalBytes += fileStat.size;
      if (totalBytes > MAX_SKILL_TOTAL_BYTES) throw new Error(`Skill source exceeds ${MAX_SKILL_TOTAL_BYTES} total bytes`);
      files.push({ relativePath: relative(sourcePath, path), size: fileStat.size });
      if (files.length > MAX_SKILL_FILES) throw new Error(`Skill source exceeds ${MAX_SKILL_FILES} files`);
    }
  }

  await walk(sourcePath);
  return files;
}

export async function importSkillDirectory(source: string, name = basename(resolve(source)), force = false): Promise<string> {
  assertSafeName(name);
  const sourcePath = resolve(source);
  try { await access(join(sourcePath, "SKILL.md"), constants.R_OK); } catch { throw new Error("Source directory must contain SKILL.md"); }

  const target = resolve(getSkillPath(name));
  const skillsRoot = resolve(getSkillsPath());
  const sourceRelativeToTarget = relative(target, sourcePath);
  const targetRelativeToSource = relative(sourcePath, target);
  if (sourcePath === target || !sourceRelativeToTarget.startsWith("..") || !targetRelativeToSource.startsWith("..")) {
    throw new Error("Skill source and target must be separate directories");
  }
  if (!relative(skillsRoot, target).startsWith(".") && relative(skillsRoot, target) !== "") {
    throw new Error("Invalid skill target path");
  }

  const files = await validateSkillTree(sourcePath);
  await mkdir(skillsRoot, { recursive: true });
  if (!force) {
    try { await access(target, constants.F_OK); throw new Error(`Skill already exists: ${name}. Use --force to replace it.`); }
    catch (error) { if (error instanceof Error && error.message.startsWith("Skill already exists:")) throw error; }
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const file of files) {
    const sourceFile = join(sourcePath, file.relativePath);
    const targetFile = join(target, file.relativePath);
    const current = await lstat(sourceFile);
    if (!current.isFile() || current.isSymbolicLink()) throw new Error(`Skill source changed during import: ${file.relativePath}`);
    await mkdir(resolve(targetFile, ".."), { recursive: true });
    await copyFile(sourceFile, targetFile);
  }
  return target;
}

export function formatSkills(): string { return builtInSkills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n"); }
