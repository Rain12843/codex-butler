export type SkillCategory = "frontend" | "backend" | "database" | "testing" | "security" | "refactoring" | "git" | "github" | "docker" | "python" | "react" | "flutter" | "devops";

export interface SkillDefinition {
  name: SkillCategory;
  description: string;
}

export const builtInSkills: SkillDefinition[] = [
  { name: "frontend", description: "Frontend architecture, UI implementation, and accessibility" },
  { name: "backend", description: "API, service, and server-side development" },
  { name: "database", description: "Schema design, queries, migrations, and data safety" },
  { name: "testing", description: "Unit, integration, regression, and test strategy" },
  { name: "security", description: "Secure coding, dependency review, and threat awareness" },
  { name: "refactoring", description: "Safe incremental refactoring and technical debt reduction" },
  { name: "git", description: "Commits, branches, diffs, rebases, and repository hygiene" },
  { name: "github", description: "Issues, pull requests, reviews, and GitHub workflows" },
  { name: "docker", description: "Containerization, images, compose, and reproducible environments" },
  { name: "python", description: "Python application structure, tooling, and testing" },
  { name: "react", description: "React component design, state, hooks, and performance" },
  { name: "flutter", description: "Flutter widgets, state, navigation, and platform integration" },
  { name: "devops", description: "CI/CD, deployment, observability, and infrastructure workflows" }
];

export function formatSkills(): string {
  return builtInSkills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");
}
