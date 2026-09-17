import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultConfig, getConfigPath } from "./config.js";

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
