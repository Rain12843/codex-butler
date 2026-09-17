import assert from "node:assert/strict";
import { test } from "node:test";
import { formatWorkflowDiagnosis, formatWorkflowRuns, type WorkflowDiagnosis, type WorkflowRunSummary } from "./ci.js";

test("workflow formatter produces a compact diagnostics table", () => {
  const runs: WorkflowRunSummary[] = [{
    databaseId: 123,
    name: "CI",
    status: "completed",
    conclusion: "failure",
    branch: "main",
    commit: "abcdef1234567890",
    url: "https://github.com/example/repo/actions/runs/123",
    createdAt: "2026-09-17T03:00:00Z"
  }];
  const output = formatWorkflowRuns(runs);
  assert.match(output, /\| CI \| failure \| main \| abcdef1 \|/);
});

test("workflow formatter handles an empty repository", () => {
  assert.match(formatWorkflowRuns([]), /No workflow runs found/);
});

test("workflow formatter escapes table-breaking content", () => {
  const output = formatWorkflowRuns([{
    databaseId: 1,
    name: "CI | nightly",
    status: "completed",
    conclusion: "success",
    branch: "feature/a|b",
    commit: "1234567890",
    url: "https://example.test",
    createdAt: "2026-09-17T03:00:00Z\nextra"
  }]);
  assert.match(output, /CI \\| nightly/);
  assert.match(output, /feature\/a\\|b/);
  assert.doesNotMatch(output, /03:00:00Z\nextra/);
});

test("workflow diagnosis formatter marks logs as untrusted", () => {
  const diagnosis: WorkflowDiagnosis = {
    runId: 123,
    summary: {
      databaseId: 123,
      name: "CI",
      status: "completed",
      conclusion: "failure",
      branch: "main",
      commit: "abcdef1234567890",
      url: "https://example.test/run/123",
      createdAt: "2026-09-17T03:00:00Z"
    },
    failedSteps: ["npm run check"],
    category: "TypeScript",
    likelyCause: "The workflow reached a TypeScript type-checking error.",
    nextSteps: ["Run `npm run check` locally."],
    logExcerpt: "error TS2322: untrusted log content"
  };
  const output = formatWorkflowDiagnosis(diagnosis);
  assert.match(output, /Untrusted log excerpt/);
  assert.match(output, /error TS2322/);
  assert.match(output, /npm run check/);
});
