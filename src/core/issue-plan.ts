import { formatTaskPlan, planTask, type TaskPlan } from "./planner.js";
import type { GitHubContext } from "./github.js";

export function planGitHubContext(context: GitHubContext): TaskPlan {
  const task = `${context.kind === "issue" ? "Issue" : "Pull request"} #${context.number}: ${context.title}\n\n${context.body}`;
  return planTask(task);
}

export function formatGitHubTaskPlan(context: GitHubContext): string {
  return [`# ${context.kind === "issue" ? "Issue" : "Pull Request"} #${context.number} Plan`, "", `**${context.title}**`, "", formatTaskPlan(planGitHubContext(context))].join("\n");
}
