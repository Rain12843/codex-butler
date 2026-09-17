import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface ProjectInfo {
  root: string;
  files: string[];
  packageManager?: string;
  language: string;
}

export async function analyzeProject(root: string): Promise<ProjectInfo> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
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

  return { root, files, packageManager, language };
}

export function generateAgents(project: ProjectInfo): string {
  const install = project.packageManager ? `${project.packageManager} install` : "Add the project install command here";
  const test = project.packageManager === "npm" ? "npm test" : "Add the project test command here";

  return `# AGENTS.md\n\n## Project\n\nThis file defines working instructions for Codex in this repository.\n\n- Detected language: ${project.language}\n- Package manager: ${project.packageManager ?? "not detected"}\n\n## Working rules\n\n1. Read existing code and documentation before making changes.\n2. Prefer small, reviewable changes over broad rewrites.\n3. Preserve existing public APIs unless the task explicitly requires a breaking change.\n4. Do not add dependencies when the standard library or existing dependency can solve the problem.\n5. Never commit secrets, credentials, tokens, private keys, or generated local state.\n6. Run relevant tests and checks before declaring a task complete.\n7. Update documentation when behavior or public interfaces change.\n\n## Commands\n\n### Install\n\`${install}\`\n\n### Test\n\`${test}\`\n\n## Git workflow\n\n- Keep commits focused and descriptive.\n- Inspect the diff before committing.\n- Do not rewrite unrelated user changes.\n\n## Codex behavior\n\nWhen requirements are ambiguous, inspect the repository for conventions before asking questions. Explain assumptions briefly when they materially affect the implementation.\n`;
}
