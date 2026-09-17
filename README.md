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
codex-butler init
codex-butler skills install testing
codex-butler skills show testing
```

Typical daily flow:

```bash
codex-butler plan "fix the failing auth test"
codex-butler github issue-plan 42
codex-butler github ci-diagnose
codex-butler github pr-review 18
```

## Commands

```text
codex-butler setup
codex-butler doctor
codex-butler status
codex-butler init [--force]
codex-butler plan "<task>"
codex-butler github issue <number>
codex-butler github pr <number>
codex-butler github issue-plan <number>
codex-butler github pr-plan <number>
codex-butler github pr-review <number>
codex-butler github ci
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
- `doctor` — inspect Node.js, Git, Codex CLI, GitHub CLI, Python, `~/.codex`, Codex instruction files, user/project skill directories, configuration, and MCP configuration evidence.
- `status` — compact environment + Codex readiness summary with the current Butler mode.
- `init` — recursively inspect the project (with depth/file safety limits, skipping generated/dependency directories), detect the package manager and common language/tooling files, generate `AGENTS.md`, initialize `.codex-butler/` project memory, and ensure `.codex-butler/` is gitignored.
- `plan` — turn a plain-language task into a deterministic work plan covering inspection, implementation, validation, and risks. It performs no network calls and does not execute the task.
- `github issue` / `github pr` — read issue or pull-request context through the locally installed GitHub CLI. Butler passes fixed argument lists to `gh` and does not invoke a shell or execute content from the issue/PR body.
- `github issue-plan` / `github pr-plan` — combine GitHub context with Butler's deterministic planner.
- `github pr-review` — produce a structured review checklist from PR metadata and changed files.
- `github ci` — list recent workflow runs and their status, branch, commit, and creation time. It is read-only and uses the local GitHub CLI.
- `github ci-diagnose` — inspect failed-step logs for a workflow run and produce deterministic diagnostics: failed steps, a coarse error category, likely cause, next actions, and a bounded untrusted log excerpt. If no run ID is supplied, Butler selects the most recent failed run among the last 10 runs; an explicit run ID also loads its workflow metadata.
- `skills` / `skills list` — browse built-in skills with practical checklists for common domains.
- `skills show` — preview a built-in skill template or an already-installed `SKILL.md`.
- `skills install` — install a reviewable local skill template into Codex's user skill discovery directory (`~/.agents/skills`). Existing skills are protected from accidental overwrite unless `--force` is supplied.
- `skills install-all` — install every built-in skill in one pass (skips existing skills unless `--force`).
- `skills import` — import a local `SKILL.md` directory after validating that it contains only regular files, no symlinks, and stays within file-count and size limits. Use `--name` to choose the installed skill name.
- `skills audit` — scan an installed `SKILL.md` for common risky patterns such as remote shell execution, destructive commands, instruction-override attempts, and credential-like content.
- `config` — manage Butler's local configuration and default operating mode.

## Security model

Butler is intentionally conservative:

- It never executes shell commands derived from issue/PR bodies or skill text.
- GitHub access goes through the installed `gh` CLI with fixed argument lists.
- Skill import validates tree shape (no symlinks, bounded file count and size) before installation.
- Skill audit is heuristic and advisory; it does not claim to prove safety.
- Project memory under `.codex-butler/` is gitignored by default.

Built-in and imported skills are installed under `~/.agents/skills/`, which is a Codex skill discovery path (user scope).

## Project memory

`codex-butler init` creates `.codex-butler/` with files for architecture, conventions, decisions, lessons, and project metadata. The directory is gitignored by default so local project context does not get committed accidentally.

## Development

```bash
npm install
npm run check
npm test
npm run build
```

CI runs type checking, builds, and tests on pushes to `main` and pull requests.

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
- [ ] Skill registry with signed/verified sources
- [ ] Codex configuration deep inspection
- [ ] GitHub issue / PR action workflows
- [ ] Optional MCP server mode
