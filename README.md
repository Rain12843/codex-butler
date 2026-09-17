# Codex Butler

> The productivity layer for OpenAI Codex.

Codex Butler is a local CLI that helps developers configure, diagnose, and organize a Codex-powered development workflow.

**Not affiliated with or endorsed by OpenAI.**

## Why

Codex is powerful, but getting a repository ready for reliable agentic development still involves manual setup: instructions, environment checks, reusable skills, project conventions, and diagnostics.

Codex Butler turns those repetitive steps into one workflow.

## Quick start

```bash
npm install
npm run build
npm start -- setup
npm start -- doctor
```

## Commands

```text
codex-butler setup
codex-butler doctor
codex-butler init [--force]
codex-butler plan "<task>"
codex-butler github issue <number>
codex-butler github pr <number>
codex-butler skills
codex-butler skills list
codex-butler skills path
codex-butler skills install <name> [--force]
codex-butler skills remove <name>
codex-butler skills audit <name>
codex-butler config
codex-butler config show
codex-butler config init
codex-butler config mode <mode>
```

- `setup` — initialize Butler's user configuration and show the first-time checklist.
- `doctor` — inspect Node.js, Git, Codex CLI, GitHub CLI, Python, `~/.codex`, AGENTS.md, configuration, and MCP configuration evidence.
- `init` — recursively inspect the project (while skipping generated/dependency directories), detect the package manager and common language/tooling files, generate `AGENTS.md`, and initialize `.codex-butler/` project memory.
- `plan` — turn a plain-language task into a deterministic work plan covering inspection, implementation, validation, and risks. It performs no network calls and does not execute the task.
- `github issue` / `github pr` — read issue or pull-request context through the locally installed GitHub CLI. Butler passes fixed argument lists to `gh` and does not invoke a shell or execute content from the issue/PR body.
- `skills` — browse built-in skills.
- `skills install` — install a reviewable local skill template. Existing skills are protected from accidental overwrite unless `--force` is supplied.
- `skills audit` — scan an installed `SKILL.md` for common risky patterns such as remote shell execution, destructive commands, instruction-override attempts, and credential-like content.
- `config` — manage Butler's local configuration and default operating mode.

### Security model

Skills are instructions, not trusted executable programs. Butler's built-in installer writes plain-text `SKILL.md` files and does not execute their contents. Imported or downloaded skills should be treated as untrusted input and audited before use. The audit is heuristic rather than a security guarantee; it can produce false positives and cannot prove that a skill is safe.

OpenAI's current developer guidance also recommends auditing skills and other instruction files because models can be sensitive to instructions contained in them. citeturn0search1

### Operating modes

`fast`, `developer`, `deep`, `review`, `debug`, `architecture`, `release`, `autonomous`

### Local skill storage

Built-in skills are installed under `~/.codex-butler/skills/`. Butler does not execute downloaded code as part of skill installation; the initial installer writes a reviewable `SKILL.md` template locally.

## Project memory

`codex-butler init` creates `.codex-butler/` with files for architecture, conventions, decisions, lessons, and project metadata. The directory is ignored by Git by default so local project context does not get committed accidentally.

## Development

Requirements: Node.js 20+.

```bash
npm install
npm run check
npm run build
npm test
```

CI runs type checking, builds, and tests on pushes to `main` and pull requests.

## Roadmap

- [x] CLI foundation
- [x] Environment diagnostics
- [x] Recursive project analyzer
- [x] AGENTS.md generator
- [x] Skill catalog foundation
- [x] Persistent project memory foundation
- [x] Local skill installer
- [x] Butler configuration manager
- [x] GitHub Actions CI foundation
- [x] Skill installation path hardening
- [x] Skill security audit foundation
- [x] Deterministic task planner foundation
- [x] GitHub issue / PR context foundation
- [ ] Skill registry with signed/verified sources
- [ ] Codex configuration deep inspection
- [ ] GitHub issue / PR action workflows
- [ ] CI failure diagnostics
- [ ] Interactive setup wizard
- [ ] Workflow presets
- [ ] AI-assisted task planner / prompt translator

## License

MIT
