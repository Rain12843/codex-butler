import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface SkillFinding {
  severity: "warning" | "high";
  rule: string;
  detail: string;
}

const rules: Array<[RegExp, SkillFinding["severity"], string]> = [
  [/curl\s+[^\n|]+\|\s*(sh|bash)|wget\s+[^\n|]+\|\s*(sh|bash)/i, "high", "Downloads and pipes remote content directly into a shell"],
  [/rm\s+-rf\s+(\/|~|\$HOME)/i, "high", "Deletes files from a broad filesystem location"],
  [/sudo\s+/i, "warning", "Requests elevated privileges"],
  [/chmod\s+777|chown\s+-R/i, "warning", "Changes permissions or ownership broadly"],
  [/ignore\s+(previous|all)\s+instructions|disregard\s+(previous|system)/i, "high", "Contains instruction-override language"],
  [/BEGIN (RSA|OPENSSH|PRIVATE) KEY|sk-[A-Za-z0-9]{20,}/i, "high", "Looks like a private key or API credential"],
  [/\.env|credentials|password|api[_ -]?key|secret/i, "warning", "References sensitive credential material"]
];

export async function auditSkillFile(path: string): Promise<SkillFinding[]> {
  const text = await readFile(path, "utf8");
  const findings: SkillFinding[] = [];
  for (const [pattern, severity, detail] of rules) {
    if (pattern.test(text)) findings.push({ severity, rule: pattern.source, detail });
  }
  return findings;
}

export async function auditSkillDirectory(directory: string): Promise<SkillFinding[]> {
  return auditSkillFile(join(directory, "SKILL.md"));
}
