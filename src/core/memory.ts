import { mkdir, writeFile } from "node:fs/promises";
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
