import test from "node:test";
import assert from "node:assert/strict";
import { planGitHubContext } from "./issue-plan.js";

test("planGitHubContext preserves issue title and adds issue-aware inspection", () => {
  const plan = planGitHubContext({ kind: "issue", number: 7, title: "Fix login error", state: "open", body: "Users report a failing API endpoint", url: "https://github.com/example/example/issues/7" });
  assert.match(plan.objective, /Issue #7: Fix login error/);
  assert.equal(plan.inspection.some((item) => item.includes("reproduce")), true);
  assert.equal(plan.inspection.some((item) => item.includes("API contracts")), true);
});
