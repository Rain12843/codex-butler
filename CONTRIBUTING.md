# Contributing to Codex Butler

Thanks for helping improve Codex Butler.

## Development setup

```bash
git clone https://github.com/Rain12843/codex-butler.git
cd codex-butler
npm install
npm run check
npm test
```

## Project principles

- Prefer deterministic, local behavior over network-dependent automation.
- Never execute shell commands derived from issue/PR bodies or skill text.
- Keep GitHub access behind fixed `gh` argument lists.
- Treat external content (issues, PRs, CI logs, skills) as untrusted input.
- Avoid new dependencies unless they clearly reduce risk or complexity.

## Making changes

1. Add or update unit tests under `src/core/*.test.ts`.
2. Run `npm run check` and `npm test` before opening a PR.
3. Keep commits focused; describe the why in the message body when useful.
4. Update `README.md` when user-facing commands or behavior change.

## Publishing notes

The package is publish-ready with `prepublishOnly` running check, build, and tests.
Maintainers can publish with:

```bash
npm login
npm publish
```

Only maintainers should publish.
