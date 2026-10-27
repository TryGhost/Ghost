# Help panel agent guidance

Read [`README.md`](./README.md) first: it explains the principle, the contract
with the help center, the search rules, the trade-offs and the production
checklist.

## Important warnings

- Admin holds no help content. Titles, excerpts and which articles show on
  which page come from the help center at runtime. Don't add help copy or
  per-page article lists to Admin beyond the existing fallbacks.
- Never rename a page key, account alert key or `general`: articles tagged
  `#admin-<key>` in the help center would silently stop showing. When adding
  a key, slug or topic, keep `help-contract.ts` and the README tables in step.
- Keep the rules in the pure modules (`help-pages.ts`, `help-suggestions.ts`,
  `help-questions.ts`, `help-markdown.ts`, `help-site-card-kinds.ts`,
  `help-article-html.ts`) and cover changes in their tests. Hooks and
  components should stay thin.
- Don't add a "Contact support" entry point up front. Support is offered only
  where an answer didn't do it, or when the user asks for a person (README,
  "Decisions and trade-offs").
- Mocked behaviour is marked `PROTOTYPE:`. Keep the marker on anything new
  that's mocked, and remove it with the mock.
- The panel is Ghost(Pro) only (`HelpPanelProvider`). Self-hosted sites must
  keep the old Help link.
- Never commit a value for `HELP_CENTER_API_KEY` in `help-center.ts`. It's
  added locally (README, "Checking changes"); without it, Help links out.
- Questions go to DocsBot (`help-docsbot.ts`) from the browser, with the page
  name folded into the question. Don't add anything about the user or site to
  what's sent without a privacy review. The team and bot ids there are a test
  bot's.
- DocsBot's answers are Markdown rendered by `help-markdown.ts`; render them
  only through `prepareArticleHtml`, like article HTML.
- Article HTML is untrusted: render it only through `prepareArticleHtml`.
- UI is Shade only. Don't restyle Shade components.

## Checks

- `pnpm exec vitest run src/help` in `apps/admin` for the unit tests.
- `pnpm nx run @tryghost/admin:lint` and
  `pnpm nx run @tryghost/admin:test:types` before committing.
