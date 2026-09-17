import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export interface ProjectInfo {
  root: string;
  files: string[];
  directories: string[];
  packageManager?: string;
  language: string;
  scripts: Record<string, string>;
}

const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", "coverage", ".venv", "venv"]);

async function walk(root: string, current: string, files: string[], directories: string[]): Promise<void> {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      directories.push(relative(root, path));
      await walk(root, path, files, directories);
    } else if (entry.isFile()) {
      files.push(relative(root, path));
    }
  }
}

export async function analyzeProject(root: string): Promise<ProjectInfo> {
  const files: string[] = [];
  const directories: string[] = [];
  await walk(root, root, files, directories);
  const has = (name: string) => files.includes(name);

  let packageManager: string | undefined;
  if (has("pnpm-lock.yaml")) packageManager = "pnpm";
  else if (has("yarn.lock")) packageManager = "yarn";
  else if (has("package-lock.json")) packageManager = "npm";
  else if (has("bun.lockb") || has("bun.lock")) packageManager = "bun";

  let language = "unknown";
  if (has("tsconfig.json")) language = "TypeScript";
  else if (has("package.json")) language = "JavaScript";
  else if (has("pyproject.toml") || has("requirements.txt")) language = "Python";
  else if (has("pubspec.yaml")) language = "Dart/Flutter";
  else if (has("go.mod")) language = "Go";
  else if (has("Cargo.toml")) language = "Rust";

  let scripts: Record<string, string> = {};
  if (has("package.json")) {
    try {
      const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
      scripts = packageJson.scripts ?? {};
    } catch {
      scripts = {};
    }
  }

  return { root, files: files.sort(), directories: directories.sort(), packageManager, language, scripts };
}

export function generateAgents(project: ProjectInfo): string {
  const runner = project.packageManager ?? "npm";
  const install = project.packageManager ? `${runner} install` : "Add the project install command here";
  const test = project.scripts.test ? `${runner} test` : project.language === "Python" ? "python -m pytest" : "Add the project test command here";
  const build = project.scripts.build ? `${runner} run build` : "Add the project build command here";
  const structure = project.directories.slice(0, 20).map((directory) => `- ${directory}/`).join("\n") || "- No subdirectories detected";

  return `# AGENTS.md\n\n## Project\n\nThis file defines working instructions for Codex in this repository.\n\n- Detected language: ${project.language}\n- Package manager: ${project.packageManager ?? "not detected"}\n\n## Repository structure\n\n${structure}\n\n## Working rules\n\n1. Read existing code and documentation before making changes.\n2. Prefer small, reviewable changes over broad rewrites.\n3. Preserve existing public APIs unless the task explicitly requires a breaking change.\n4. Do not add dependencies when the standard library or existing dependency can solve the problem.\n5. Never commit secrets, credentials, tokens, private keys, or generated local state.\n6. Run relevant tests and checks before declaring a task complete.\n7. Update documentation when behavior or public interfaces change.\n\n## Commands\n\n### Install\n\`${install}\`\n\n### Test\n\`${test}\`\n\n### Build\n\`${build}\`\n\n## Git workflow\n\n- Keep commits focused and descriptive.\n- Inspect the diff before committing.\n- Do not rewrite unrelated user changes.\n\n## Codex behavior\n\nWhen requirements are ambiguous, inspect the repository for conventions before asking questions. Explain assumptions briefly when they materially affect the implementation.\n`;
}
