# Codex Butler

> The productivity layer for OpenAI Codex.

Codex Butler is a local CLI that helps developers configure, diagnose, and organize a Codex-powered development workflow.

Codex is powerful, but getting a repository ready for reliable agentic development still involves repeated setup, environment checks, skill management, and GitHub context gathering.

Codex Butler turns those repetitive steps into one workflow.

## Install

```bash
# from source
git clone https://github.com/Rain12843/codex-butler.git
cd codex-butler
npm install
npm run build
npm start -- doctor
```

After building, you can also link it locally:

```bash
npm link
codex-butler doctor
```

## Quick start

```bash
codex-butler setup
codex-butler doctor
codex-butler status
codex-butler codex-config
codex-butler init
codex-butler skills install testing
codex-butler skills show testing
codex-butler plan "fix the failing auth test" --prompt
```

Typical daily flow:

```bash
codex-butler plan "fix the failing auth test"
codex-butler github issue-plan 42 --prompt
codex-butler github ci-diagnose
codex-butler github pr-review 18
```

## Commands

```text
codex-butler setup
codex-butler doctor
codex-butler status
codex-butler codex-config
codex-butler init [--force]
codex-butler plan "<task>" [--json|--prompt]
codex-butler mcp
codex-butler github issue <number>
codex-butler github pr <number>
codex-butler github issue-create --title <title> --body-file <path> [--submit]
codex-butler github issue-comment <number> --body-file <path> [--submit]
codex-butler github pr-comment <number> --body-file <path> [--submit]
codex-butler github issue-plan <number> [--json|--prompt]
codex-butler github pr-plan <number> [--json|--prompt]
codex-butler github pr-review <number>
codex-butler github ci | github runs
codex-butler github ci-diagnose [run-id]
codex-butler skills
codex-butler skills list
codex-butler skills show <name>
codex-butler skills install <name> [--force]
codex-butler skills install-all [--force]
codex-butler skills import <path> [--name <name>] [--force]
codex-butler skills audit <name>
codex-butler skills remove <name>
codex-butler config show
codex-butler config mode <mode>
```

- `setup` — initialize Butler's user configuration and show the first-time checklist.
- `doctor` — inspect Node.js, Git, Codex CLI, GitHub CLI, Python, `~/.codex`, config model/approval/sandbox, skills, and MCP evidence. Exits with code `1` if Node.js or Codex CLI is missing.
- `status` — compact environment + Codex readiness summary with the current Butler mode.
- `codex-config` — summarize `~/.codex/config.toml`: model, provider, approval policy, sandbox mode, reasoning effort, MCP servers, and optional project `.codex/config.toml`.
- `init` — recursively inspect the project (with depth/file safety limits), generate `AGENTS.md`, initialize `.codex-butler/` project memory, and ensure it is gitignored.
- `plan` — deterministic work plan. Use `--json` for structured output or `--prompt` for a compact prompt you can paste into Codex.
- `mcp` — optional read-only MCP server over stdio with task planning, bounded project summaries, skill listing, and skill auditing.
- `github issue` / `github pr` — read issue or pull-request context through the local `gh` CLI with fixed argument lists.
- `github issue-create` — safely preview an Issue assembled from a validated title and local Markdown body; create it only with explicit `--submit`.
- `github issue-comment` / `github pr-comment` — safely preview a local Markdown comment; publish only with explicit `--submit`. Body files are bounded, must be regular files, and are rejected when they appear to contain credentials.
- `github issue-plan` / `github pr-plan` — combine GitHub context with the planner (`--json` / `--prompt` supported).
- `github pr-review` — structured review checklist from PR metadata and changed files.
- `github ci` / `github runs` — list recent workflow runs.
- `github ci-diagnose` — deterministic diagnostics for a failed workflow run.
- `skills list` — built-in skills with `[installed]` / `[available]` markers, plus custom imports.
- `skills show` / `install` / `install-all` / `import` / `audit` / `remove` — manage Codex skills under `~/.agents/skills`.
- `config` — manage Butler's local configuration and default operating mode.

## Security model

Butler is intentionally conservative:

- It never executes shell commands derived from issue/PR bodies or skill text.
- It redacts common credential formats before showing issue bodies, PR diffs, or CI log excerpts.
- GitHub access goes through the installed `gh` CLI with fixed argument lists.
- Skill import validates tree shape (no symlinks, bounded file count and size) before installation.
- Skill audit scans the full bounded skill tree and remains heuristic and advisory; it does not claim to prove safety.
- Project memory under `.codex-butler/` is gitignored by default.
- Config inspection is read-only and does not print secrets from `auth.json` or environment variables.

Built-in and imported skills are installed under `~/.agents/skills/`, which is a Codex skill discovery path (user scope).

## Optional MCP server

Run Butler as a local stdio MCP server:

```bash
codex mcp add codex-butler -- codex-butler mcp
```

The server exposes only read-only tools: `plan_task`, `project_summary`, `skills_list`, and `skill_audit`. Project inspection is restricted to the server working directory and its descendants.

## Project memory

`codex-butler init` creates `.codex-butler/` with files for architecture, conventions, decisions, lessons, and project metadata. The directory is gitignored by default so local project context does not get committed accidentally.

## Development

```bash
npm install
npm run check
npm test
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. CI runs type checking, builds, and tests on pushes to `main` and pull requests.

## Roadmap

- [x] Setup / doctor / init foundation
- [x] Deterministic task planning
- [x] GitHub issue / PR context via local `gh`
- [x] CI failure diagnosis foundation
- [x] GitHub PR review foundation
- [x] GitHub issue / PR planning foundation
- [x] Imported skill tree hardening foundation
- [x] Practical built-in skill checklists
- [x] Project scan safety limits
- [x] Compact status command
- [x] Skills show / install-all / named import
- [x] Codex configuration deep inspection
- [x] Plan JSON / paste-ready Codex prompt
- [x] Doctor critical exit codes
- [ ] Skill registry with signed/verified sources
- [x] GitHub issue / PR comment workflow foundation
- [ ] Additional GitHub issue / PR action workflows
- [x] Optional read-only MCP server foundation
- [ ] npm publish
