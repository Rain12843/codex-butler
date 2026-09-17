# Codex Butler

> The productivity layer for OpenAI Codex.

Codex Butler is a local CLI that helps developers configure, diagnose, and organize a Codex-powered development workflow.

**Not affiliated with or endorsed by OpenAI.**

## Why

Codex is powerful, but getting a repository ready for reliable agentic development still involves manual setup: instructions, environment checks, reusable skills, project conventions, and diagnostics.

Codex Butler turns those repetitive steps into one workflow.

## MVP

```bash
codex-butler setup
codex-butler doctor
codex-butler init
codex-butler skills
codex-butler config
```

### Commands

- `setup` — first-time environment checklist
- `doctor` — check Node.js, Git, Codex CLI, GitHub CLI, and Python
- `init` — inspect the current project and generate `AGENTS.md`
- `skills` — show the built-in skill catalog
- `config` — show configuration and project-memory locations

## Development

Requirements: Node.js 20+.

```bash
npm install
npm run build
npm start -- doctor
```

For development:

```bash
npm run dev -- doctor
```

## Roadmap

- [x] CLI foundation
- [x] Environment diagnostics
- [x] Project analyzer
- [x] AGENTS.md generator
- [x] Skill catalog foundation
- [ ] Persistent project memory
- [ ] Skill installer and registry
- [ ] Codex configuration manager
- [ ] GitHub issue / PR workflows
- [ ] CI diagnostics
- [ ] Interactive setup wizard
- [ ] Workflow presets

## License

MIT
