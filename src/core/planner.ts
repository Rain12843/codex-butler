export interface TaskPlan {
  objective: string;
  context: string[];
  constraints: string[];
  inspection: string[];
  steps: string[];
  validation: string[];
  risks: string[];
}

const genericInspection = [
  "Read the README and repository instructions.",
  "Inspect the relevant source files, tests, and configuration before editing.",
  "Check existing patterns before introducing a new dependency or abstraction."
];

function cleanTask(task: string): string {
  return task.trim().replace(/\s+/g, " ");
}

function inferInspection(task: string): string[] {
  const lower = task.toLowerCase();
  const items = [...genericInspection];
  if (/test|bug|fix|error|fail|issue/.test(lower)) items.push("Inspect existing tests and reproduce the reported behavior before changing code.");
  if (/api|server|backend|endpoint/.test(lower)) items.push("Inspect API contracts, validation, error handling, and integration boundaries.");
  if (/ui|frontend|react|flutter|css|layout/.test(lower)) items.push("Inspect existing UI components, responsive behavior, accessibility, and visual conventions.");
  if (/database|sql|schema|migration/.test(lower)) items.push("Inspect schema, migrations, transaction boundaries, and data compatibility.");
  if (/ci|deploy|docker|workflow|github/.test(lower)) items.push("Inspect CI/CD configuration and the commands used by automation.");
  return [...new Set(items)];
}

function inferValidation(task: string): string[] {
  const lower = task.toLowerCase();
  const checks = ["Run the narrowest relevant tests first.", "Run the project's type check, lint, or build command when available.", "Review the final diff for unrelated changes, secrets, and accidental generated files."];
  if (/bug|fix|error|fail|issue/.test(lower)) checks.unshift("Verify the original failure no longer reproduces and add a regression test when practical.");
  return checks;
}

export function planTask(task: string): TaskPlan {
  const objective = cleanTask(task);
  if (!objective) throw new Error("Task description cannot be empty");
  return {
    objective,
    context: ["Treat the repository as the source of truth.", "Preserve existing behavior unless the task explicitly changes the contract."],
    constraints: ["Keep the change focused and reviewable.", "Do not expose secrets or modify unrelated files.", "Prefer existing dependencies and conventions."],
    inspection: inferInspection(objective),
    steps: ["Confirm the current behavior and identify the smallest affected surface.", "Implement the change incrementally, keeping public interfaces stable unless required.", "Update tests and documentation when behavior or interfaces change."],
    validation: inferValidation(objective),
    risks: ["Hidden coupling may exist outside the initially identified files.", "A passing build may not cover behavioral regressions; validate the task-specific outcome."]
  };
}

export function formatTaskPlan(plan: TaskPlan): string {
  const section = (title: string, items: string[]) => `## ${title}\n${items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
  return [`# Codex Task Plan\n\n**Objective:** ${plan.objective}`, section("Context", plan.context), section("Constraints", plan.constraints), section("Inspect first", plan.inspection), section("Implementation", plan.steps), section("Validation", plan.validation), section("Risks", plan.risks)].join("\n\n") + "\n";
}
