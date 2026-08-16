# Writing Codebase Documentation

Ghost's codebase documentation explains how to understand, change, test, and
ship this repository. It is public and reviewed alongside the code it
describes.

## Choose the Right Home

Give each topic one canonical home. Link to that source instead of copying it
into another documentation surface.

| Content | Home |
| --- | --- |
| Codebase-wide setup, workflow, architecture, and practices | `/docs` |
| Package, service, app, or test-suite details | A README beside the code |
| Canonical domain language | A `CONTEXT.md` beside the domain |
| Relationships between bounded contexts | The root `CONTEXT-MAP.md` |
| Contribution policy and the contributor entry point | `.github/CONTRIBUTING.md` |
| Agent-only execution rules and constraints | The nearest `AGENTS.md` or repository skill |
| Product, API, theme, and self-hosting documentation | [ghost.org/docs](https://ghost.org/docs/) |
| Proposals, company process, private operations, and temporary work | The internal Ghost workspace |

- Keep the root README focused on introducing Ghost and directing contributors
  to the codebase documentation.
- Use `/docs` for guidance that crosses workspace or domain boundaries.
- Keep package or service details beside the code and link to them from an
  overview where useful.

## Context Files

- A `CONTEXT.md` is a glossary for a bounded context: its important terms,
  precise meanings, and terms to avoid.
- Keep architecture and implementation details in the nearby README or an
  appropriate codebase guide.
- Add each bounded context and its relationships to the root `CONTEXT-MAP.md`.

## Who Should Update the Docs?

Whoever changes or introduces a documented concept is responsible for updating
its documentation.

- Update the docs in the same pull request as the code, workflow, command, or
  behaviour they describe.
- Check the nearest README, `/docs`, and agent guidance when a change crosses
  those surfaces.
- Update both the overview and focused guide when readers need both.
- Ask an owner of the affected area to review specialist guidance, but do not
  leave the documentation work for them to discover later.

## Write for the Current Codebase

- Check guidance against the current code, scripts, tests, and configuration.
- Run or otherwise verify commands and paths where practical.
- Leave one canonical answer and link to it instead of copying it.
- Use direct language, short sections, and examples from real commands or code.
- Keep critical information in an overview, then link with “For more detail” to
  a focused guide.
- Use relative repository links and link to stable files or symbols rather than
  line numbers.
- Copy public-safe images into the repository instead of using expiring Notion
  URLs.

## Keep Public and Private Guidance Separate

- Keep repository documentation public and useful to contributors.
- Never include credentials, secrets, customer or site data, private repository
  details, internal hostnames, or incident and operational procedures.
- Document public integration boundaries where contributors need them; keep
  private deployment and operations in the internal workspace.
- Review private source material before the first commit. Never commit it and
  remove the sensitive parts later.

## Keep Human and Agent Guidance in Sync

- Treat human-readable documentation as the source of truth for facts and
  conventions shared by people and agents.
- Keep `AGENTS.md` focused on directions to canonical docs and agent-specific
  execution constraints.
- Link repository skills to the canonical guide instead of repeating it.
- Update human documentation and any agent entry points that need to discover
  it in the same pull request.
- Keep each tracked `AGENTS.md` at or below 150 lines. The documentation lint
  enforces this limit.

## Check Your Change

Run the repository hygiene check before submitting documentation changes:

```bash
pnpm check
pnpm lint:docs
git diff --check origin/main...HEAD
```

- Check links manually; `pnpm lint:docs` does not currently validate Markdown
  links.
- Confirm another document does not give a different answer.
- Confirm no private or temporary material is being published.
- After a migrated guide is live, replace links to its Notion source and retire
  the old page.
