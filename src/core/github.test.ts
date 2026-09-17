import assert from "node:assert/strict";
import { test } from "node:test";
import { formatGitHubContext, type GitHubContext } from "./github.js";

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
