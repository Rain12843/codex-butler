import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { defaultConfig, ensureConfig, getConfigPath, normalizeConfig, saveConfig } from "./config.js";

async function withTemporaryHome(run: () => Promise<void>): Promise<void> {
  const home = await mkdtemp(join(tmpdir(), "codex-butler-config-"));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env.HOME;
    else process.env.HOME = previous;
    await rm(home, { recursive: true, force: true });
  }
}

test("default configuration is stable", () => {
  assert.equal(defaultConfig.version, 1);
  assert.equal(defaultConfig.defaultMode, "developer");
  assert.equal(defaultConfig.projectMemory, true);
  assert.equal(defaultConfig.autoDetect, true);
  assert.deepEqual(defaultConfig.skillPaths, []);
});

test("config path is under the user's home directory", () => {
  assert.match(getConfigPath(), /\.codex-butler[\\/]config\.json$/);
});

test("invalid persisted values fall back to safe defaults", () => {
  const config = normalizeConfig({
    version: 999,
    defaultMode: 123,
    projectMemory: "yes",
    autoDetect: null,
    skillPaths: ["/valid", 42, "", null]
  });
  assert.deepEqual(config, {
    version: 1,
    defaultMode: "developer",
    projectMemory: true,
    autoDetect: true,
    skillPaths: ["/valid"]
  });
});

test("valid configuration values are preserved", () => {
  assert.deepEqual(normalizeConfig({
    defaultMode: "review",
    projectMemory: false,
    autoDetect: false,
    skillPaths: ["/one", "/two"]
  }), {
    version: 1,
    defaultMode: "review",
    projectMemory: false,
    autoDetect: false,
    skillPaths: ["/one", "/two"]
  });
});

test("ensureConfig repairs malformed configuration", async () => {
  await withTemporaryHome(async () => {
    await mkdir(join(process.env.HOME!, ".codex-butler"), { recursive: true });
    await writeFile(getConfigPath(), "{not valid json", "utf8");
    assert.deepEqual(await ensureConfig(), defaultConfig);
    assert.deepEqual(JSON.parse(await readFile(getConfigPath(), "utf8")), defaultConfig);
  });
});

test("saveConfig writes a private configuration file", async () => {
  await withTemporaryHome(async () => {
    await saveConfig({ ...defaultConfig, defaultMode: "review" });
    assert.equal((await stat(getConfigPath())).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await readFile(getConfigPath(), "utf8")).defaultMode, "review");
  });
});
