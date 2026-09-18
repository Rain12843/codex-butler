import test from "node:test";
import assert from "node:assert/strict";
import { extractMcpServerNames, extractTomlValue, summarizeConfigText } from "./codex.js";

test("extractTomlValue reads quoted and bare values", () => {
  const text = `model = "gpt-5.5#stable" # comment\napproval_policy = on-request\nsandbox_mode = 'workspace-write'\n`;
  assert.equal(extractTomlValue(text, "model"), "gpt-5.5#stable");
  assert.equal(extractTomlValue(text, "approval_policy"), "on-request");
  assert.equal(extractTomlValue(text, "sandbox_mode"), "workspace-write");
  assert.equal(extractTomlValue(text, "missing_key"), null);
});

test("extractTomlValue ignores values inside TOML tables", () => {
  const text = `[profiles.review]\nmodel = "profile-model"\n`;
  assert.equal(extractTomlValue(text, "model"), null);
});

test("extractMcpServerNames finds table headers", () => {
  const text = `[mcp_servers.github]\ncommand = "gh"\n\n[mcp_servers.docs]\nurl = "https://example.com/mcp"\n`;
  assert.deepEqual(extractMcpServerNames(text), ["github", "docs"]);
});

test("summarizeConfigText flags high-autonomy combinations", () => {
  const summary = summarizeConfigText(
    `model = "gpt-5.5"\napproval_policy = "never"\nsandbox_mode = "danger-full-access"\n`,
    "/tmp/config.toml"
  );
  assert.equal(summary.model, "gpt-5.5");
  assert.equal(summary.approvalPolicy, "never");
  assert.equal(summary.sandboxMode, "danger-full-access");
  assert.ok(summary.notes.some((note) => /High-autonomy/.test(note)));
});
