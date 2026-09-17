import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { builtInSkills, getSkillPath, validateSkillTree } from "./skills.js";

test("built-in skills use safe names", () => {
  assert.equal(builtInSkills.length > 0, true);
  for (const skill of builtInSkills) assert.match(skill.name, /^[a-z0-9][a-z0-9-]{0,63}$/);
});

test("getSkillPath rejects traversal names", () => {
  assert.throws(() => getSkillPath("../outside"), /Invalid skill name/);
  assert.throws(() => getSkillPath("skill/name"), /Invalid skill name/);
});

test("validateSkillTree rejects symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-butler-skill-"));
  const outside = await mkdtemp(join(tmpdir(), "codex-butler-outside-"));
  try {
    await writeFile(join(outside, "secret.txt"), "secret", "utf8");
    await writeFile(join(root, "SKILL.md"), "---\nname: test\n---\n", "utf8");
    await symlink(join(outside, "secret.txt"), join(root, "secret.txt"));
    await assert.rejects(validateSkillTree(root), /cannot contain symlinks/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("validateSkillTree rejects oversized files", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-butler-skill-"));
  try {
    await writeFile(join(root, "SKILL.md"), Buffer.alloc(256 * 1024 + 1));
    await assert.rejects(validateSkillTree(root), /exceeds 262144 bytes/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateSkillTree rejects more than 64 files", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-butler-skill-"));
  try {
    for (let index = 0; index < 65; index++) await writeFile(join(root, `file-${index}.txt`), "x", "utf8");
    await assert.rejects(validateSkillTree(root), /exceeds 64 files/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validateSkillTree accepts a bounded regular-file tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-butler-skill-"));
  try {
    await writeFile(join(root, "SKILL.md"), "---\nname: test\n---\n", "utf8");
    const files = await validateSkillTree(root);
    assert.equal(files.length, 1);
    assert.equal(files[0]?.relativePath, "SKILL.md");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
