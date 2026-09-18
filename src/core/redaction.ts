const assignmentPattern = /^([+-]?\s*["']?(?:api[_-]?key|secret|token|password|authorization)["']?\s*[:=]\s*)(.+)$/gim;
const bearerPattern = /(\bbearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi;
const knownTokenPattern = /\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g;
const privateKeyPattern = /-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-\r\n]*PRIVATE KEY-----|$)/gi;

/** Redact common credential forms before external text is printed to a terminal or report. */
export function redactSensitiveText(text: string): string {
  return text
    .replace(privateKeyPattern, "[REDACTED PRIVATE KEY]")
    .replace(knownTokenPattern, "[REDACTED TOKEN]")
    .replace(bearerPattern, "$1[REDACTED]")
    .replace(assignmentPattern, "$1[REDACTED]");
}
