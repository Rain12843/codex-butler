import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  buildGitHubCommentArgs,
  commentOnGitHub,
  formatGitHubCommentResult,
  loadGitHubCommentBody,
} from "./github.js";

test("comment workflow defaults to a non-mutating preview", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-butler-comment-"));
  try {
    const path = join(directory, "comment.md");
    await writeFile(path, "Looks good to me.\n", "utf8");
    const result = await commentOnGitHub("issue", 42, path);
    assert.equal(result.submitted, false);
    assert.equal(result.url, null);
    assert.match(formatGitHubCommentResult(result), /preview only/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("comment body rejects credentials and symbolic links", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-butler-comment-"));
  try {
    const sensitive = join(directory, "sensitive.md");
    await writeFile(sensitive, "API_KEY=super-secret-value\n", "utf8");
    await assert.rejects(loadGitHubCommentBody(sensitive), /appears to contain credentials/);
    const link = join(directory, "link.md");
    await symlink(sensitive, link);
    await assert.rejects(loadGitHubCommentBody(link), /symbolic link/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("comment arguments keep untrusted body text in one fixed argument", () => {
  const body = "hello; rm -rf /\n$(touch /tmp/example)";
  assert.deepEqual(buildGitHubCommentArgs("pull_request", 7, body), ["pr", "comment", "7", "--body", body]);
});
