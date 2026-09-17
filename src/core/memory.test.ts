import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ensureButlerGitignore, initMemory } from "./memory.js";

test("initMemory creates expected files once", async () => {
  const root = await mkdtemp(join(tmpdir(), "butler-memory-"));
  const first = await initMemory(root);
  assert.equal(first.length, 5);
  const second = await initMemory(root);
  assert.equal(second.length, 0);
});

test("ensureButlerGitignore adds entry when missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "butler-gi-"));
  const updated = await ensureButlerGitignore(root);
  assert.equal(updated, true);
  const content = await readFile(join(root, ".gitignore"), "utf8");
  assert.match(content, /\.codex-butler\//);
  const again = await ensureButlerGitignore(root);
  assert.equal(again, false);
});

test("ensureButlerGitignore appends without duplicating", async () => {
  const root = await mkdtemp(join(tmpdir(), "butler-gi2-"));
  await writeFile(join(root, ".gitignore"), "node_modules/\n", "utf8");
  const updated = await ensureButlerGitignore(root);
  assert.equal(updated, true);
  const content = await readFile(join(root, ".gitignore"), "utf8");
  assert.match(content, /node_modules\/\n\.codex-butler\/\n/);
});
