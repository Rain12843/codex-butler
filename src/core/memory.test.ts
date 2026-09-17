import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ensureButlerGitignore, initMemory } from "./memory.js";

test("initMemory creates files once and ensureButlerGitignore is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-butler-memory-"));
  try {
    const created = await initMemory(root);
    assert.ok(created.length >= 5);
    const second = await initMemory(root);
    assert.equal(second.length, 0);

    const first = await ensureButlerGitignore(root);
    assert.equal(first, true);
    const again = await ensureButlerGitignore(root);
    assert.equal(again, false);
    const text = await readFile(join(root, ".gitignore"), "utf8");
    assert.match(text, /\.codex-butler\//);

    await writeFile(join(root, ".gitignore"), "node_modules/\n", "utf8");
    const appended = await ensureButlerGitignore(root);
    assert.equal(appended, true);
    const updated = await readFile(join(root, ".gitignore"), "utf8");
    assert.match(updated, /node_modules\//);
    assert.match(updated, /\.codex-butler\//);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
