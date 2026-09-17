import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { analyzeProject, generateAgents } from "./project.js";

test("analyzeProject detects TypeScript npm project", async () => {
  const root = await mkdtemp(join(tmpdir(), "butler-project-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test", build: "tsc" } }), "utf8");
  await writeFile(join(root, "tsconfig.json"), "{}", "utf8");
  await writeFile(join(root, "package-lock.json"), "{}", "utf8");
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "index.ts"), "export {};\n", "utf8");

  const project = await analyzeProject(root);
  assert.equal(project.language, "TypeScript");
  assert.equal(project.packageManager, "npm");
  assert.equal(project.scripts.test, "node --test");
  assert.equal(project.truncated, false);
  assert.ok(project.files.includes("src/index.ts"));
});

test("generateAgents includes safety rules and commands", async () => {
  const root = await mkdtemp(join(tmpdir(), "butler-agents-"));
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "npm test" } }), "utf8");
  const project = await analyzeProject(root);
  const agents = generateAgents(project);
  assert.match(agents, /Never commit secrets/);
  assert.match(agents, /Treat issue bodies/);
  assert.match(agents, /npm test/);
});
