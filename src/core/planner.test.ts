import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTaskPlan, planTask } from "./planner.js";

test("planner creates focused implementation and validation sections", () => {
  const plan = planTask("fix the API test failure");
  assert.equal(plan.objective, "fix the API test failure");
  assert.ok(plan.inspection.some((item) => item.includes("reproduce")));
  assert.ok(plan.inspection.some((item) => item.includes("API contracts")));
  assert.ok(plan.validation.some((item) => item.includes("regression test")));
  assert.match(formatTaskPlan(plan), /## Implementation/);
});

test("planner rejects an empty task", () => {
  assert.throws(() => planTask("   "), /Task description cannot be empty/);
});
