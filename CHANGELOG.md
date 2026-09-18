# Changelog

## Unreleased

- Add an optional read-only stdio MCP server with planning, project summary, and skill tools
- Add a safe, preview-first `github issue-create` workflow
- Add safe, preview-first `github issue-comment` and `github pr-comment` workflows
- Redact common passwords, tokens, authorization headers, and private keys from external content excerpts
- Write Butler configuration atomically with private permissions and repair malformed JSON during setup
- Add a lockfile and use `npm ci` in CI for reproducible installs
- Prevent built-in skill installation from overwriting existing files without `--force`
- Make forced skill imports stage and roll back replacements safely
- Ignore profile/table values when inspecting top-level Codex TOML settings
- Audit every file in a bounded skill tree and report the finding path
- Classify `npm test` lifecycle failures as test failures instead of dependency failures
- Avoid duplicate builds in CI and the prepublish check
- Exclude compiled test files from the published npm package

## 0.8.2

- `doctor --json` for machine-readable environment reports
- CI runs on Node.js 22
- Fix `extractTomlValue` regex escapes (config model/approval/sandbox parsing)

## 0.8.1

- `plan` / `github issue-plan` / `github pr-plan` support `--json` and `--prompt`
- `doctor` exits with code 1 when Node.js or Codex CLI is missing
- Skills list shows `[installed]` / `[available]` markers
- CONTRIBUTING.md added

## 0.8.0

- `codex-config` summarizes `~/.codex/config.toml`
- Doctor surfaces model, approval policy, sandbox mode, MCP servers
- `github runs` alias for `github ci`

## 0.7.1

- `skills show`, `skills install-all`, named `skills import`
- Safer `installSkill` string validation

## 0.7.0

- `status` command, project scan limits, richer skill checklists
- Project memory gitignore on `init`
