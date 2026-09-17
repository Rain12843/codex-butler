import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultConfig, getConfigPath, normalizeConfig } from "./config.js";

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
