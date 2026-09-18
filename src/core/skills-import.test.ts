import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { builtInSkills, getSkillPath, getSkillsPath, importSkillDirectory, installSkill, validateSkillTree } from "./skills.js";

async function withTemporaryHome(run: (home: string) => Promise<void>): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), "codex-butler-home-"));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    await run(home);
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
    await rm(home, { recursive: true, force: true });
  }
}

test("built-in skills use safe names", () => {
  assert.equal(builtInSkills.length > 0, true);
  for (const skill of builtInSkills) assert.match(skill.name, /^[a-z0-9][a-z0-9-]{0,63}$/);
});

test("skills use Codex's user discovery directory", () => {
  assert.equal(getSkillsPath(), join(homedir(), ".agents", "skills"));
  assert.equal(getSkillPath("testing"), join(homedir(), ".agents", "skills", "testing"));
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

test("installSkill preserves an existing skill unless force is set", async () => {
  await withTemporaryHome(async () => {
    const target = getSkillPath("testing");
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "SKILL.md"), "custom content\n", "utf8");

    await assert.rejects(installSkill("testing"), /already exists/);
    assert.equal(await readFile(join(target, "SKILL.md"), "utf8"), "custom content\n");

    await installSkill("testing", true);
    assert.match(await readFile(join(target, "SKILL.md"), "utf8"), /^---\nname: testing\n/);
  });
});

test("importSkillDirectory preserves and safely replaces an existing skill", async () => {
  await withTemporaryHome(async () => {
    const source = await mkdtemp(join(tmpdir(), "codex-butler-source-"));
    try {
      await writeFile(join(source, "SKILL.md"), "new content\n", "utf8");
      const target = getSkillPath("custom");
      await mkdir(target, { recursive: true });
      await writeFile(join(target, "SKILL.md"), "old content\n", "utf8");

      await assert.rejects(importSkillDirectory(source, "custom"), /already exists/);
      assert.equal(await readFile(join(target, "SKILL.md"), "utf8"), "old content\n");

      await importSkillDirectory(source, "custom", true);
      assert.equal(await readFile(join(target, "SKILL.md"), "utf8"), "new content\n");
    } finally {
      await rm(source, { recursive: true, force: true });
    }
  });
});

test("importSkillDirectory rejects overlapping source and destination", async () => {
  await withTemporaryHome(async () => {
    const target = getSkillPath("custom");
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "SKILL.md"), "keep me\n", "utf8");
    await assert.rejects(importSkillDirectory(target, "custom", true), /must not overlap/);
    assert.equal(await readFile(join(target, "SKILL.md"), "utf8"), "keep me\n");
  });
});
