import test from "node:test";
import assert from "node:assert/strict";
import { formatCodexPrompt, formatTaskPlan, planTask } from "./planner.js";

test("planTask rejects empty objective", () => {
  assert.throws(() => planTask("   "), /cannot be empty/);
});

test("planTask produces structured sections", () => {
  const plan = planTask("fix the failing auth test");
  assert.match(plan.objective, /auth/);
  assert.ok(plan.inspection.length > 0);
  assert.ok(plan.validation.length > 0);
  const markdown = formatTaskPlan(plan);
  assert.match(markdown, /# Codex Task Plan/);
  assert.match(markdown, /## Validation/);
});

test("formatCodexPrompt is paste-friendly", () => {
  const prompt = formatCodexPrompt(planTask("add regression tests for login"));
  assert.match(prompt, /^Task: /);
  assert.match(prompt, /Constraints:/);
  assert.match(prompt, /Prefer small, reviewable changes/);
});
