# Contributing

Thanks for taking the time. This document covers the workflow; the architecture
notes in [`CLAUDE.md`](CLAUDE.md) explain how the code is organised.

## Before you start

- Check existing [issues](https://github.com/ArteGEIE/production-cost-analyzer/issues) and open
  one for anything non-trivial so we can agree on the approach first.
- Small fixes (typos, obvious bugs, docs) can go straight to a pull request.

## Development setup

```bash
npm install
cp .env.example .env      # DEMO_MODE=true and a local DATABASE_URL are enough
npm run db:migrate && npm run db:seed:cc && npm run db:seed:demo
npm run dev
```

Tests run against an in-memory PostgreSQL (PGlite); they need no database or API key:

```bash
npm test            # or npm run test:watch
npm run lint
npm run typecheck
```

## Conventions

- **Language**: code, comments and commit messages in English. User-facing text in French
  and German through `messages/fr.json` and `messages/de.json` (both catalogs must expose the
  same keys — a test enforces it). Untranslatable domain terms stay French (`devis`,
  `grille_cnc`, `producteur`).
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`,
  `refactor:`, `test:`, `docs:`, `chore:`, `ci:`, `perf:`, `style:`. Keep them small and atomic.
- **Tests**: co-located `module.spec.ts(x)` next to the module, in the same commit as the
  change. Prefer testing behaviour over implementation.
- **Configuration over code**: anything an organisation might want to change (labels,
  thresholds, referentials, branding) belongs in `config/*.json` or environment variables,
  never hardcoded. See [`docs/configuration.md`](docs/configuration.md).
- **Privacy**: never commit real budgets, producer names, hostnames or credentials. The
  `documents/` folder is gitignored for that reason; fixtures must be fictional.
- **Docs in the same PR** as the code they describe.

## Pull requests

1. Branch from `main` (`feat/…`, `fix/…`).
2. Make sure `npm test`, `npm run lint` and `npm run typecheck` pass locally.
3. Fill in the pull request template. CI runs lint, typecheck, tests, a Docker build.
4. A maintainer reviews; squash-merge is the default.

## Database changes

Edit `src/lib/db/schema.ts`, then `npm run db:generate` to produce a migration in
`drizzle/`. Commit the generated SQL and snapshot. Migrations must be backwards-compatible
with the running version for one release (rolling deployments).

## Releasing

Maintainers tag `vX.Y.Z` on `main`. Adopters build the image from a tag; no public
image is distributed (the organisation's registry policy does not allow public packages).
