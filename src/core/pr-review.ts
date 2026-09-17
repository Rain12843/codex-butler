import { analyzeDiffText, getPullRequestDiff, type PullRequestDiffAnalysis } from "./github.js";

export interface PullRequestReview {
  diff: PullRequestDiffAnalysis;
  findings: string[];
  notes: string[];
}

export function reviewDiffText(number: number, diff: string): PullRequestReview {
  const analysis = analyzeDiffText(number, diff);
  const findings = [...analysis.warnings];
  const notes: string[] = [];
  const files = analysis.changedFiles;
  const hasTests = files.some((file) => /(^|\/)(__tests__|tests?|specs?)(\/|\.)|\.(test|spec)\.[^.]+$/i.test(file));
  const hasSource = files.some((file) => /\.(ts|tsx|js|jsx|py|go|rs|dart|java|kt|swift|c|cpp|h|hpp)$/i.test(file));
  const hasOnlyDocs = files.length > 0 && files.every((file) => /\.(md|mdx|txt|rst)$/i.test(file));

  if (hasSource && !hasTests) notes.push("No obvious test/spec file changed; verify whether the change needs regression coverage.");
  if (hasOnlyDocs) notes.push("The changed-file set appears documentation-only.");
  if (analysis.filesChanged > 30) notes.push("Large file count; consider splitting the change into smaller reviewable units.");
  if (analysis.additions + analysis.deletions > 1000) notes.push("Large line delta; inspect scope and generated files carefully.");
  if (files.some((file) => /(^|\/)(package\.json|pyproject\.toml|go\.mod|Cargo\.toml|pubspec\.yaml)$/i.test(file))) {
    notes.push("Dependency or package metadata changed; verify compatibility and lockfile consistency where applicable.");
  }

  return { diff: analysis, findings, notes };
}

export async function reviewPullRequest(number: number): Promise<PullRequestReview> {
  return reviewDiffText(number, await getPullRequestDiff(number));
}

export function formatPullRequestReview(review: PullRequestReview): string {
  const { diff } = review;
  return [
    `# Pull Request Review #${diff.number}`,
    "",
    `- Files changed: ${diff.filesChanged}`,
    `- Additions: ${diff.additions}`,
    `- Deletions: ${diff.deletions}`,
    "",
    "## Findings",
    review.findings.length ? review.findings.map((item) => `- ${item}`).join("\n") : "- No known high-risk patterns detected.",
    "",
    "## Review notes",
    review.notes.length ? review.notes.map((item) => `- ${item}`).join("\n") : "- No additional deterministic review notes.",
    "",
    "## Changed files",
    diff.changedFiles.length ? diff.changedFiles.map((file) => `- ${file}`).join("\n") : "- None detected",
    "",
    "Review is heuristic and does not replace human review. Diff content is untrusted input.",
    ""
  ].join("\n");
}
