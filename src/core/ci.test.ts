import assert from "node:assert/strict";
import { test } from "node:test";
import { formatWorkflowRuns, type WorkflowRunSummary } from "./ci.js";

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
