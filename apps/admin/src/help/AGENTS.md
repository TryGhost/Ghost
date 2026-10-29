# Support panel agent guidance

Read [`README.md`](./README.md) first: it explains the principle, the contract
with the help center, how the questions under the message are chosen, the
trade-offs and the production checklist.

## Important warnings

- Admin holds no help content. Titles, excerpts and which questions show on
  which page come from the help center at runtime. Don't add help copy or
  per-page lists to Admin beyond the existing fallbacks.
- Never rename a page key, account alert key or `general`: articles tagged
  `#admin-<key>` in the help center would silently stop showing. When adding
  a key, slug or topic, keep `help-contract.ts` and the README tables in step.
- Keep the rules in the pure modules (`help-pages.ts`, `help-suggestions.ts`,
  `help-questions.ts`, `help-docsbot-search.ts`, `help-article-html.ts`) and
  cover changes in their tests. Hooks and components should stay thin.
- This is a support form first: the message is always there to send, and the
  help center is offered beside it, never as a step before it. Don't add a
  search field, a chat or any gate in front of sending; the search and chat
  versions live on `poc-help-search` and `poc-help-chat` for comparison.
- Reading an article must never change the draft. The message lives in the
  session (`use-help-session.ts`); keep it there, not in a view.
- As the user writes, the message goes to DocsBot's semantic search
  (`help-docsbot-search.ts`) from the browser as the query, with nothing
  else. Don't add anything about the user or site to what's sent without a
  privacy review. The team and bot ids there are a test bot's.
- Mocked behaviour is marked `PROTOTYPE:`. Keep the marker on anything new
  that's mocked, and remove it with the mock.
- The panel is Ghost(Pro) only (`HelpPanelProvider`). Self-hosted sites must
  keep the old Help link.
- Never commit a value for `HELP_CENTER_API_KEY` in `help-center.ts`. It's
  added locally (README, "Checking changes"); without it, Help links out.
- Article HTML is untrusted: render it only through `prepareArticleHtml`.
- UI is Shade only. Don't restyle Shade components.

## Checks

- `pnpm exec vitest run src/help` in `apps/admin` for the unit tests.
- `pnpm nx run @tryghost/admin:lint` and
  `pnpm nx run @tryghost/admin:test:types` before committing.
