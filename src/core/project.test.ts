import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { analyzeProject, generateAgents } from "./project.js";

test("analyzeProject detects TypeScript npm projects and generates AGENTS.md", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-butler-project-"));
  try {
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "node --test", build: "tsc", check: "tsc --noEmit" } }), "utf8");
    await writeFile(join(root, "package-lock.json"), "{}", "utf8");
    await writeFile(join(root, "tsconfig.json"), "{}", "utf8");
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src", "index.ts"), "export {}", "utf8");
    const project = await analyzeProject(root);
    assert.equal(project.language, "TypeScript");
    assert.equal(project.packageManager, "npm");
    assert.equal(project.truncated, false);
    const agents = generateAgents(project);
    assert.match(agents, /TypeScript/);
    assert.match(agents, /npm test/);
    assert.match(agents, /untrusted input/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
