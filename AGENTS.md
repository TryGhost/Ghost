# AGENTS.md

Agent-specific execution guidance for the Ghost monorepo. Human-readable setup,
workflow, architecture, and practice guidance lives in the
[codebase documentation](docs/README.md) and nearby package READMEs.

Start with:

- [Development setup](docs/contributing/development-setup.md)
- [Contribution workflow](docs/contributing/workflow.md)
- [Writing codebase documentation](docs/contributing/documentation.md)
- [Testing](docs/contributing/testing.md)
- [Shipping](docs/contributing/shipping.md)
- [Monorepo structure](docs/codebase/monorepo-structure.md)

## Required workflow

- Always use `pnpm`, never npm or Yarn. External dependency versions belong in
  the catalogs in `pnpm-workspace.yaml`; workspace dependencies use
  `workspace:` versions.
- Run `pnpm setup` before other commands in a fresh checkout or worktree.
- Use `pnpm check` as the default full validation command. Browser E2E and Ember
  Admin tests run separately; follow the testing guide.
- Read the nearest `AGENTS.md`, `CLAUDE.md`, and README before changing a package
  or subsystem. More specific guidance overrides this file.
- When committing, load and follow `.agents/skills/commit/SKILL.md`.

## Repository skills

Repository skills live under `.agents/skills/`. When adding one, also add the
matching `.claude/skills/<name>` symlink to
`../../.agents/skills/<name>`. Run `pnpm lint:agent-skills` to verify discovery.

Use the relevant repository skill before adding an Admin API endpoint, database
migration, private feature flag, Shade component, or internal package.

## Task routing and important warnings

- **Admin UI:** read [`apps/admin/README.md`](apps/admin/README.md) and
  [`apps/shade/AGENTS.md`](apps/shade/AGENTS.md). Build new features in React,
  use `admin-x-framework` for APIs, and use Shade for UI. Admin and Core deploy
  independently, so feature-detect backend support and test the older-backend
  case.
- **Embedded Admin CSS:** do not import `@tryghost/shade/styles.css` from an
  embedded app. Admin owns the single Tailwind and Shade CSS lane.
- **Translations:** follow the
  [internationalization guide](docs/practices/internationalization.md). Run the
  extraction command after changing `t()` calls and never split one sentence
  across translation calls.
- **Public apps:** read the app's README and the
  [shipping guide](docs/contributing/shipping.md). Their release and CSS lanes
  differ from Admin.
- **Ghost Core:** use the [server map](docs/codebase/monorepo-structure.md#ghost-core)
  and read the [services guide](ghost/core/core/server/services/README.md) before
  adding a service. New standalone services use TypeScript; keep CommonJS only
  at existing `require()` boundaries. Boot owns service initialization; do not
  initialize on the first request.
- **ESLint:** use the shared factories and dependency rules in the
  [ESLint configuration README](configs/eslint/README.md). A hand-written config
  must declare every plugin it imports locally.
- **Analytics:** start with `pnpm dev:analytics` and follow the nearby Tinybird
  READMEs under `ghost/core/core/server/data/tinybird/`.

Keep shared facts in human documentation. This file should contain only routing,
agent execution constraints, and high-value warnings that prevent recurring
mistakes.
