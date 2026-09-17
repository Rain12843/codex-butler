import { access, copyFile, lstat, mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";

export type SkillCategory = "frontend" | "backend" | "database" | "testing" | "security" | "refactoring" | "git" | "github" | "docker" | "python" | "react" | "flutter" | "devops";

export interface SkillDefinition {
  name: SkillCategory;
  description: string;
  guidance: string[];
}

const skillGuidance: Record<SkillCategory, string[]> = {
  frontend: [
    "Inspect package.json scripts, framework config, and existing component patterns before editing.",
    "Prefer existing design tokens / CSS variables / utility classes over one-off styles.",
    "Keep accessibility in mind: labels, focus order, keyboard support, and semantic HTML.",
    "Verify responsive behavior and avoid layout thrash in shared components.",
    "Run the project's lint and typecheck for UI packages when available.",
  ],
  backend: [
    "Map request/response boundaries, auth middleware, and error handling before changing routes.",
    "Prefer existing logging, validation, and serialization helpers over new ad-hoc code.",
    "Keep side effects (DB, queue, email) explicit and testable.",
    "Avoid leaking internal errors to clients; preserve status code conventions.",
    "Add or update tests for the changed endpoint or service path.",
  ],
  database: [
    "Read existing schema/migration style and naming conventions first.",
    "Prefer additive, reversible migrations; never drop data without an explicit plan.",
    "Index for the actual query patterns; avoid speculative indexes.",
    "Keep transactions short and document isolation needs when relevant.",
    "Update seed/fixture data and repository tests together with schema changes.",
  ],
  testing: [
    "Locate the nearest existing test helpers and patterns before inventing new ones.",
    "Cover the failure path and boundary cases, not only the happy path.",
    "Prefer deterministic tests: freeze time, stub network, avoid order dependence.",
    "Keep tests close to the unit under change; avoid over-mocking implementation details.",
    "Run the relevant test target and confirm the suite still passes.",
  ],
  security: [
    "Treat all external input as untrusted; validate and sanitize at boundaries.",
    "Never log secrets, tokens, or full credentials; redact sensitive fields.",
    "Prefer parameterized queries and existing auth helpers over string concatenation.",
    "Review authorization checks on every new or changed endpoint.",
    "Flag any new network egress, shell execution, or file write paths for explicit review.",
  ],
  refactoring: [
    "Preserve behavior first; add characterization tests before large structural changes.",
    "Make small, reviewable commits; avoid mixing renames with logic changes.",
    "Update call sites, types, and docs in the same change set when practical.",
    "Delete dead code only after confirming it is unreferenced.",
    "Re-run lint, typecheck, and the nearest tests after the refactor.",
  ],
  git: [
    "Keep commits focused; prefer descriptive subjects and optional body for rationale.",
    "Do not rewrite published history unless the team explicitly agrees.",
    "Use conventional or project-standard prefixes when the repo already does.",
    "Avoid committing secrets, build artifacts, or local-only paths.",
    "Verify status and diff before creating commits or PRs.",
  ],
  github: [
    "Read issue/PR context fully before proposing changes; quote requirements in the plan.",
    "Keep PR descriptions actionable: summary, test plan, and risk notes.",
    "Link related issues and avoid drive-by scope expansion.",
    "Prefer small PRs that can be reviewed in one sitting.",
    "Use the local gh CLI via Butler helpers rather than ad-hoc shell strings.",
  ],
  docker: [
    "Prefer multi-stage builds and explicit, pinned base tags when the project already does.",
    "Keep secrets out of images; use build args/env only as the project already does.",
    "Minimize layers and avoid copying unnecessary context.",
    "Document required ports, volumes, and healthchecks next to the Dockerfile.",
    "Validate with a local build and the project's compose/test flow when available.",
  ],
  python: [
    "Follow the project's formatter, type checker, and package layout.",
    "Prefer type hints and existing validation libraries over informal checks.",
    "Keep virtualenv / lockfile changes intentional and reviewed.",
    "Avoid broad except; catch specific exceptions at boundaries.",
    "Run the project's pytest or unittest target for touched modules.",
  ],
  react: [
    "Reuse existing hooks, context, and component composition patterns.",
    "Keep components pure when possible; isolate side effects in effects or handlers.",
    "Avoid prop drilling when the project already uses context or a state library.",
    "Memoize only after measuring; prefer clarity over premature optimization.",
    "Update component tests and Storybook stories when they exist for the surface.",
  ],
  flutter: [
    "Match existing widget structure, theming, and state management approach.",
    "Prefer const constructors and avoid unnecessary rebuilds in hot paths.",
    "Keep platform channels and native code changes tightly scoped and documented.",
    "Update golden/widget tests for visual or interaction changes.",
    "Run analyzer and the nearest flutter test target after edits.",
  ],
  devops: [
    "Read existing CI workflows and deployment scripts before changing them.",
    "Keep secrets in the platform secret store; never hard-code credentials.",
    "Prefer idempotent scripts and explicit version pins for tools.",
    "Document required environment variables next to the workflow or script.",
    "Validate with a dry-run or the project's staging pipeline when available.",
  ],
};

export const builtInSkills: SkillDefinition[] = (Object.keys(skillGuidance) as SkillCategory[]).map((name) => ({
  name,
  description: `Practical ${name} checklist for Codex-assisted work`,
  guidance: skillGuidance[name],
}));

function assertSafeName(name: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) {
    throw new Error(`Invalid skill name: ${name}`);
  }
}

export function getSkillsPath(): string {
  return join(homedir(), ".agents", "skills");
}

export function getSkillPath(name: string): string {
  assertSafeName(name);
  return join(getSkillsPath(), name);
}

function skillMarkdown(skill: SkillDefinition): string {
  const checklist = skill.guidance.map((item) => `- [ ] ${item}`).join("\n");
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n# ${skill.name}\n\n${skill.description}\n\n## Checklist\n\n${checklist}\n`;
}

export async function installSkill(name: SkillCategory, force = false): Promise<string> {
  assertSafeName(name);
  const skill = builtInSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`Unknown skill: ${name}`);
  const targetDir = getSkillPath(name);
  const targetFile = join(targetDir, "SKILL.md");
  try {
    await access(targetFile, constants.F_OK);
    if (!force) throw new Error(`Skill already exists at ${targetFile}. Use --force to overwrite.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof Error && error.message.includes("already exists"))) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  await mkdir(targetDir, { recursive: true });
  await writeFile(targetFile, skillMarkdown(skill), "utf8");
  return targetFile;
}

export async function listInstalledSkills(): Promise<string[]> {
  const root = getSkillsPath();
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

export async function removeSkill(name: string): Promise<void> {
  assertSafeName(name);
  const target = getSkillPath(name);
  await rm(target, { recursive: true, force: true });
}

const MAX_SKILL_FILES = 64;
const MAX_SKILL_BYTES = 256 * 1024;

export interface SkillTreeFile {
  relativePath: string;
  size: number;
}

export async function validateSkillTree(source: string): Promise<SkillTreeFile[]> {
  const files: SkillTreeFile[] = [];
  let totalBytes = 0;
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const st = await lstat(full);
      if (st.isSymbolicLink()) throw new Error(`Skill tree cannot contain symlinks: ${relative(source, full)}`);
      if (st.isDirectory()) {
        await walk(full);
      } else if (st.isFile()) {
        files.push({ relativePath: relative(source, full), size: st.size });
        totalBytes += st.size;
        if (files.length > MAX_SKILL_FILES) throw new Error(`Skill tree exceeds ${MAX_SKILL_FILES} files`);
        if (st.size > MAX_SKILL_BYTES) throw new Error(`Skill file exceeds ${MAX_SKILL_BYTES} bytes`);
        if (totalBytes > MAX_SKILL_BYTES * 2) throw new Error(`Skill tree exceeds size limit`);
      } else {
        throw new Error(`Unsupported file type in skill tree: ${relative(source, full)}`);
      }
    }
  }
  await walk(source);
  const skillMd = join(source, "SKILL.md");
  try {
    await access(skillMd, constants.F_OK);
  } catch {
    throw new Error("Skill directory must contain SKILL.md at the root");
  }
  return files;
}

export async function importSkillDirectory(sourcePath: string, force = false): Promise<string> {
  const source = resolve(sourcePath);
  const name = basename(source);
  assertSafeName(name);
  await validateSkillTree(source);
  const targetDir = getSkillPath(name);
  try {
    await access(targetDir, constants.F_OK);
    if (!force) throw new Error(`Skill already exists at ${targetDir}. Use --force to overwrite.`);
    await rm(targetDir, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof Error && /already exists/.test(error.message))) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const stagingParent = dirname(targetDir);
  await mkdir(stagingParent, { recursive: true });
  const staging = await mkdtemp(join(stagingParent, `.${name}-staging-`));
  try {
    async function copyTree(from: string, to: string): Promise<void> {
      await mkdir(to, { recursive: true });
      const entries = await readdir(from, { withFileTypes: true });
      for (const entry of entries) {
        const src = join(from, entry.name);
        const dest = join(to, entry.name);
        const st = await lstat(src);
        if (st.isDirectory()) await copyTree(src, dest);
        else if (st.isFile()) await copyFile(src, dest);
      }
    }
    await copyTree(source, staging);
    await rename(staging, targetDir);
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
  return targetDir;
}

export function formatSkills(): string {
  return builtInSkills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");
}
