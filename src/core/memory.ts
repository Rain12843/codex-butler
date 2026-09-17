import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const files: Record<string, string> = {
  "project.json": JSON.stringify({ version: 1, createdBy: "codex-butler", notes: [] }, null, 2) + "\n",
  "architecture.md": "# Architecture\n\nDocument important architectural decisions and system boundaries here.\n",
  "conventions.md": "# Conventions\n\nRecord repository-specific coding, naming, testing, and workflow conventions here.\n",
  "decisions.md": "# Decisions\n\nRecord important decisions, alternatives considered, and the reason for each decision.\n",
  "lessons.md": "# Lessons\n\nRecord reusable lessons learned from debugging, reviews, and previous tasks.\n"
};

export async function initMemory(root: string): Promise<string[]> {
  const directory = join(root, ".codex-butler");
  await mkdir(directory, { recursive: true });
  const created: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    const path = join(directory, name);
    try {
      await writeFile(path, content, { encoding: "utf8", flag: "wx" });
      created.push(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  return created;
}

/** Ensure local project memory stays out of git. */
export async function ensureButlerGitignore(root: string): Promise<boolean> {
  const gitignorePath = join(root, ".gitignore");
  const entry = ".codex-butler/";
  let existing = "";
  try {
    existing = await readFile(gitignorePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await writeFile(gitignorePath, `${entry}\n`, "utf8");
    return true;
  }
  const lines = existing.split(/\r?\n/);
  if (lines.some((line) => line.trim() === entry || line.trim() === ".codex-butler")) return false;
  const suffix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
  await writeFile(gitignorePath, `${existing}${suffix}${entry}\n`, "utf8");
  return true;
}
