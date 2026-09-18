import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  buildGitHubIssueCreateArgs,
  createGitHubIssue,
  formatGitHubIssueCreateResult,
  validateGitHubIssueTitle,
} from "./github.js";

test("issue creation defaults to a non-mutating preview", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-butler-issue-"));
  try {
    const path = join(directory, "issue.md");
    await writeFile(path, "## Expected behavior\n\nThe command should succeed.\n", "utf8");
    const result = await createGitHubIssue(" Improve diagnostics ", path);
    assert.equal(result.title, "Improve diagnostics");
    assert.equal(result.submitted, false);
    assert.equal(result.url, null);
    assert.match(formatGitHubIssueCreateResult(result), /preview only/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("issue titles are bounded, single-line, and credential-free", () => {
  assert.throws(() => validateGitHubIssueTitle("   "), /cannot be empty/);
  assert.throws(() => validateGitHubIssueTitle("line one\nline two"), /single line/);
  assert.throws(() => validateGitHubIssueTitle("x".repeat(257)), /256 characters/);
  assert.throws(() => validateGitHubIssueTitle("token sk-abcdefghijklmnopqrstuvwxyz"), /credentials/);
});

test("issue creation arguments keep untrusted values in fixed arguments", () => {
  const title = "Bug; rm -rf /";
  const body = "$(touch /tmp/example)";
  assert.deepEqual(buildGitHubIssueCreateArgs(title, body), ["issue", "create", "--title", title, "--body", body]);
});
