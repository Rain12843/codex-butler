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
codex-butler skills
codex-butler skills list
codex-butler skills path
codex-butler skills install <name>
codex-butler skills remove <name>
codex-butler config
codex-butler config show
codex-butler config init
codex-butler config mode <mode>
```

- `setup` — initialize Butler's user configuration and show the first-time checklist.
- `doctor` — inspect Node.js, Git, Codex CLI, GitHub CLI, Python, `~/.codex`, AGENTS.md, configuration, and common MCP configuration locations.
- `init` — inspect the current project, generate `AGENTS.md`, and initialize `.codex-butler/` project memory.
- `skills` — browse built-in skills.
- `skills install` — install a safe local skill template from the built-in catalog.
- `config` — manage Butler's local configuration and default operating mode.

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

CI runs type checking and builds on pushes to `main` and pull requests.

## Roadmap

- [x] CLI foundation
- [x] Environment diagnostics
- [x] Project analyzer
- [x] AGENTS.md generator
- [x] Skill catalog foundation
- [x] Persistent project memory foundation
- [x] Local skill installer
- [x] Butler configuration manager
- [x] GitHub Actions CI foundation
- [ ] Skill registry with signed/verified sources
- [ ] Codex configuration deep inspection
- [ ] GitHub issue / PR workflows
- [ ] CI failure diagnostics
- [ ] Interactive setup wizard
- [ ] Workflow presets
- [ ] Task planner / prompt translator

## License

MIT
