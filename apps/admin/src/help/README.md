# Help panel (prototype, search)

The Help panel tries to answer questions from the
[help center](https://ghost.org/help/) before they turn into support tickets.
It docks beside the page, greets the user with a search field and three FAQ
questions for the page they're on, completes what they type with more FAQ
questions, searches the help center through DocsBot, previews the best
article with up to two more beneath it, opens articles inside Admin, and
hands off to a support form when none of that did it.

This is the **search** prototype. It's one of two built to compare:

- `poc-help-search` (this branch): a search. Each search stands alone, the
  results are help center articles, and the user reads them in the panel.
- `poc-help-chat`: a chat. DocsBot's agent writes an answer, streamed into a
  thread, with follow-ups.

Both share the shell, the article reader, the FAQ suggestions and the support
form; they differ in what happens when the user asks.

## Start here

- **Status:** a working prototype. It runs end to end against the live help
  center and DocsBot, but some parts are mocked (search the code for
  `PROTOTYPE:`), it has no feature flag, and its strings aren't translated.
  The [production checklist](#production-checklist) lists what's left.
- **Who sees it:** Ghost(Pro) sites only. Self-hosted sites keep the old Help
  link to the help center ([Who sees it](#who-sees-it)).
- **The one idea to keep:** Admin is only the experience layer. The help
  center owns the content, including which questions show on which Admin page
  ([The principle](#the-principle-admin-is-the-harness-the-help-center-owns-the-content)).
- **Reading order for the code:** `help-panel-provider.tsx` (the gate),
  `help-panel.tsx` (the shell), `use-help-search.ts` (what happens when
  someone searches), `help-docsbot-search.ts` (the DocsBot client),
  `help-questions.ts` (the FAQ: suggestions and completions), then
  `help-suggestions.ts` and `help-pages.ts` (what's suggested where).
- **Try it:** add the help center's API key locally first (it isn't in the
  repository), then see [Checking changes](#checking-changes).

## The principle: Admin is the harness, the help center owns the content

Admin holds no help copy. Every title, excerpt and article comes from the help
center at runtime, and so does the choice of which questions show on which
Admin page. Admin decides how to find articles and what to fall back on when
the help center hasn't said anything.

### Why the page-to-question mapping lives in tags, not in code

Which questions deflect which tickets is something we'll learn after launch,
week by week, from what support sees. If that mapping lived in Admin's code,
every change would need a code review and an Admin release, and sites on older
Admin versions would never get it. So the mapping is data in the help center:

- The docs or support team attaches an FAQ question to an Admin page, or to an
  account state, by adding an internal tag such as `#admin-posts` or
  `#admin-payment-failed` to it, in the help center's own Ghost Admin.
- Admin reads those tags at runtime through the Content API. A change shows in
  Admin within about 10 minutes (how long the article list is cached), with no
  deployment, on every Admin version that has the panel.
- Internal tags don't show on the help center itself, so readers never see
  them.

Admin's own per-page lists (`PAGE_QUESTIONS` in `help-pages.ts`) are only a
fallback for pages nobody has tagged yet, so the panel is useful from day one.
Once a page has any tagged question, its fallback list is ignored.

## Who sees it

Ghost(Pro) sites only. The panel exists to deflect Ghost(Pro) support tickets,
and its support form and billing alerts are Ghost(Pro)'s.

`HelpPanelProvider` checks `hostSettings.billing.enabled` in the config (the
same check Admin's billing screen uses). On other sites it renders no provider,
so `useHelpPanel()` returns nothing and the Help items in the sidebar
(`nav-settings.tsx`) and account menu (`user-menu.tsx`) keep linking to the
help center as before. The same happens without the help center's API key
(`hasHelpCenterKey` in `help-center.ts`), which is also how a key from config
should behave on older Core that doesn't provide it.

Within Ghost(Pro), billing alerts only show to people who can manage billing
(the Owner), using `useCanAccessBilling`.

## Production checklist

### Before testing with staff

- [ ] **Feature flag.** Add a private flag (the
      `.agents/skills/add-private-feature-flag` skill) and require it in
      `HelpPanelProvider` alongside the Ghost(Pro) check.
- [ ] **Make "Contact support" real.** Ghost(Pro) support is email today (the
      billing app's Support tab shows support@ghost.org). The quickest real
      version keeps the form and opens a `mailto:support@ghost.org` draft with
      the subject and message (`getSupportContext` lists the context a send
      could add, if ever wanted). A ticketing API can replace it later. Until then, `sendToSupport` in `use-help-search.ts`
      sends nothing, and the form promises a reply from the Ghost(Pro) support
      team within 24 hours on working days, which support should confirm.
- [ ] **Own the DocsBot bot.** `help-docsbot-search.ts` hardcodes a test team
      and bot (`DOCSBOT_TEAM_ID`, `DOCSBOT_BOT_ID`), asked without a key
      straight from the browser. Move them into Ghost config, decide whether
      searches should go through Ghost(Pro) instead, and point the bot at the
      production help center. Each search costs 0.1 of DocsBot's AI credits.
- [ ] **Acceptance tests.** The panel opens on Ghost(Pro); a self-hosted site
      keeps the old Help link; the help center or DocsBot being down shows the
      error state.

### Before testing with customers

- [ ] **Measurement.** Use Admin's `trackEvent` for: panel opened, search
      made, no results, article read, and what's chosen at the end of an
      article (new search, contact support). Without these
      the test can't show whether tickets are deflected.
- [ ] **Move the API URL and key into Ghost config** (`help-center.ts`), so
      they can change without an Admin release. Admin and Core deploy
      separately, so detect the config and keep working without it on older
      Core.
- [ ] **Agree the contract with the docs team** ([below](#the-contract-with-the-help-center)):
      the keys, tagging FAQ questions for the busiest pages, writing excerpts
      that read well as a result, and a heads-up before renaming any slug
      Admin refers to.
- [ ] **Check the referenced slugs automatically.** `getReferencedSlugs()` and
      `getReferencedTopics()` in `help-contract.ts` list them; a scheduled job
      or test against the live Content API would catch renames.
- [ ] **Privacy review.** Opening the panel requests help.ghost.io from the
      browser, which sends the site's origin as the referrer. Each search goes
      to DocsBot (api.docsbot.ai) as the query alone; nothing about the user
      or site is sent.
- [ ] **Rollout.** Turning the flag on for chosen customer sites depends on
      how Ghost(Pro) enables Labs features per site.

### Before general release

- [ ] Translations: `t()` for every string (see the internationalization
      guide).
- [ ] The accessibility gaps under [Known gaps](#known-gaps).
- [ ] Tests for the session (`use-help-search.ts`: searching, retrying,
      reading, the support draft) and the keyboard handling.

## How it fits together

The pure modules hold the rules and are unit tested; the hooks and components
around them are thin.

**Wiring (outside this folder)**

| File                                                                      | What it does                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `layout/admin-layout.tsx`                                                 | Wraps the layout in `HelpPanelProvider` and places `<HelpPanel />` |
| `layout/app-sidebar/nav-settings.tsx`, `layout/app-sidebar/user-menu.tsx` | Help opens the panel, or links out when there's no provider        |
| `index.css`                                                               | The `help-working-shimmer` utility for the searching status        |

**Rules (pure, unit tested)**

| File                     | What it owns                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `help-pages.ts`          | Page keys, their labels, route to key (`getPageKey`), each page's topics, fallback articles and fallback questions |
| `help-suggestions.ts`    | Account alerts (`getAccountAlert`) and the suggestion order (`getSuggestedArticles`)                               |
| `help-questions.ts`      | The FAQ's questions (`getFaqQuestions`) and completing what's typed with them (`matchQuestions`)                   |
| `help-docsbot-search.ts` | The DocsBot search client (`searchDocsBot`) and turning its hits into articles from the list (`toSearchResults`)   |
| `help-contract.ts`       | Every key, slug and topic Admin relies on the help center for, in one place                                        |
| `help-article-html.ts`   | Makes an article's HTML safe and readable in the panel                                                             |
| `help-format.ts`         | Small text helpers (`plural`, `inDays`, `getInitials`)                                                             |
| `help-fixtures.ts`       | Test fixtures: `article()`, billing states                                                                         |

**Data**

| File                       | What it owns                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `help-center.ts`           | The help center client: the article list (excerpts, topics, `#admin-…` tags) and an article's HTML                               |
| `use-help-center-index.ts` | The article list query, loaded once when the panel opens and shared by everything                                                |
| `help-signals.ts`          | What the panel knows about the user: page, role, site, timezone and Ghost(Pro) billing; the context a message to support carries |

**State**

| File                                               | What it owns                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `help-panel-provider.tsx`, `help-panel-context.ts` | Whether the panel is open, and the Ghost(Pro) gate                                                     |
| `use-help-search.ts`                               | The session: the current search and results, reading articles, the support draft, and which view shows |
| `use-help-suggestions.ts`                          | Runs `getSuggestedArticles` for the current page over the loaded article list                          |
| `use-help-typeahead.ts`                            | Completions as the user types: the draft, the highlighted question, the keyboard, the combobox ARIA    |
| `use-help-panel-size.ts`                           | The docked width, and the maximized width (the page area right of Admin's sidebar)                     |

**Views**

| File                    | What it shows                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `help-panel.tsx`        | The shell: docked on desktop, a sheet on mobile, and the three views (search, article, support)                                       |
| `help-welcome.tsx`      | The greeting, and the page's FAQ questions to pick from under a headline naming the page (or an error with a link to the help center) |
| `help-search-field.tsx` | The search field at the top, and the completions under it                                                                             |
| `help-results.tsx`      | A search's results: the first as a preview of the article, the rest with title and excerpt; the searching, empty and error states     |
| `help-article-view.tsx` | An article read in the panel, ending with "Not what you were looking for?": a new search, or support                                  |
| `help-support.tsx`      | The message to support, which takes over the panel                                                                                    |
| `help-panel-size.tsx`   | The maximize button                                                                                                                   |
| `help-reveal.ts`        | The staggered entrance blocks use                                                                                                     |

## Where the content comes from

The help center's pages are at ghost.org/help, but it's a Ghost site at
help.ghost.io, read through its public Content API (`help-center.ts`). The API
URL is hardcoded for now. The key is the public one the help center's own
search uses (the `data-key` attribute on its pages), but it's left empty in the
repository: add it locally, and don't commit it.

The panel loads the whole article list once when it opens (about 140 articles,
~25 KB in two requests): it's where results get their title, excerpt and topic,
where suggestions and completions come from, and how links between articles
open in the panel. An article's full HTML loads only when it's opened.

Each article is parsed on its own, so one malformed article is skipped rather
than failing the list. Requests time out after 10 seconds and show the error
state.

- **Titles and URLs** are the articles' own (https only).
- **Excerpts** are the custom excerpt (the Excerpt field in post settings), or
  the article's first paragraph when it has none. Results show them, so an
  excerpt that answers the title's question is the best kind.
- **Topics** are the article's public tags; the first is its primary topic.
- **Admin keys** are its internal `#admin-…` tags (slug `hash-admin-…`).

## The contract with the help center

`help-contract.ts` lists everything Admin relies on the help center to have:

- **Keys** (`getAdminKeys`): tagging an article `#admin-<key>` attaches it to a
  page or account state. Never rename a key in Admin: every article tagged
  with it would silently stop showing. Adding keys is safe; they do nothing
  until something is tagged.
- **Slugs** (`getReferencedSlugs`): articles and FAQ questions Admin falls
  back on. If one is renamed or unpublished, its fallback silently disappears.
- **Topics** (`getReferencedTopics`): tag slugs Admin maps pages to, and `faq`.

### Attaching a question to an Admin page

1. Open the FAQ article in the help center's Ghost Admin.
2. Add the internal tag `#admin-<key>`, using a page key from `help-pages.ts`
   (`PAGE_LABELS`), after its `faq` tag.
3. Within about 10 minutes, the page suggests it.

A page shows at most three suggestions. Tagged questions are ordered featured
first, then most recently updated, so featuring one moves it up.

### Account alert keys

When something about the user's Ghost(Pro) account is urgent, its article takes
the first suggestion slot. Alerts only show to those who can manage billing,
and come from what the billing app reports (as Admin's upgrade banner and
dunning warnings use it).

| Key              | When                                                    | Fallback article while none is tagged |
| ---------------- | ------------------------------------------------------- | ------------------------------------- |
| `payment-failed` | A payment failed and the site is heading for suspension | `troubleshooting-payment-issues`      |
| `trial-ending`   | The trial ends within 3 days (`TRIAL_ENDING_DAYS`)      | `manage-your-subscription`            |

These live in `ACCOUNT_ALERTS` (`help-suggestions.ts`).

## Suggestions

Before the user searches, up to three questions show for their page
(`getSuggestedArticles`), under the search field and a headline naming the
page ("Frequently asked questions for Members", from `PAGE_LABELS`). They come from the help
center's [FAQ](https://ghost.org/help/topic/faq/), the articles tagged `faq`
whose titles are questions (`getFaqQuestions`; a few FAQ titles are topics,
such as "Modifying robots.txt", and are left out). In order:

1. **Account alert**, if one applies: the article tagged for it, or its
   fallback.
2. **Questions tagged `#admin-<page>`**, or the page's fallback questions
   (`PAGE_QUESTIONS` in `help-pages.ts`) while none are tagged. Tagged
   questions replace the fallbacks outright.
3. **The FAQ's featured questions**, then the rest of the FAQ, for any slot
   left.

The FAQ's articles carry no topic tag, only `faq`, so which questions suit
which page can't come from topics: `PAGE_QUESTIONS` was picked by hand from
the FAQ's 39 questions, and `PAGE_WORDS` (used by the completions) names the
words that mark a question as about a page. Tagging an FAQ question
`#admin-<page>` in the help center replaces both without a release.

To see where a suggestion came from, inspect its row: `data-help-source` is
`alert`, `tagged`, `default`, `general`, `featured` or `faq`.

The keys 1, 2 and 3 pick the suggestions, as their number badges say, while
nothing is typed. A suggestion is an FAQ article, so picking one opens it at
once, while a search for it runs to fill "More from the help center" under
it.

## Completions as the user types

From 3 characters, the FAQ questions that continue what's typed show under
the field in place of the suggestions or results (`matchQuestions` in
`help-questions.ts`): every typed word has to start a word in the question,
the last one usually half-typed. Questions about the page the user is on come
first (`getPageRelevance`): the page's own questions (tagged `#admin-<page>`,
or its `PAGE_QUESTIONS` fallback), then questions whose title has one of the
page's words (`PAGE_WORDS` in `help-pages.ts`: "member" and "subscription"
on Members, "theme" on Design…), then the rest. Within each, questions that
start the way the user did come first. So "how do i" on Members completes
to the member questions before anything else, and on Posts to the publishing
ones. With only 35 FAQ questions, a page can run out of its own: the rest
fill in. Focus stays in the field, which is a combobox for screen
readers: the arrow keys move through the questions, Enter picks the
highlighted one, and Escape hides them until the text changes. Picking a
completion puts it in the field and, like a suggestion, opens its article at
once while a search for it runs; Enter with nothing highlighted searches for
what's typed. A question already in the
field whole isn't offered as its own completion.

## How a search works

A search goes to DocsBot's
[semantic search API](https://docsbot.ai/documentation/developer/semantic-search-api)
(`searchDocsBot` in `help-docsbot-search.ts`), whose bot is indexed on the
help center. It answers in a second or two with the chunks of text closest in
meaning to the query, best first, each with the page it came from. Nothing is
generated and nothing is remembered: there's no answer to stream and no
conversation, which is the difference from the chat prototype.

`toSearchResults` turns the chunks into articles: each page's URL is matched
to the article list by slug, an article counts once however many chunks it
contributed, pages that aren't articles in the list (topic pages, other
sites) are left out, and the first three are the results. The article list
supplies the title, excerpt and topic shown; the chunk text isn't shown, as it
reads as a fragment. Asking for 10 chunks (`TOP_K`) usually leaves three
articles after collapsing.

While it runs, placeholder rows stand in under a "Searching the help center"
status. When it lands, the first result is shown as a preview
(`HelpResultPreview`): its title and topic, then the opening of the article
itself, clamped and faded out, with "Read the full article" to open it. The
nearest page isn't always the answer, and an earlier version that opened it
in full was frustrating when it wasn't; the preview lets the user judge it
in a glance. The other results follow under "More from the help center". The
preview loads the article through the same query the article view uses, so
opening it is instant. No results, or DocsBot out of reach, offers the
Ghost(Pro) support team; the error state also offers a retry. The results
show only while the field still holds the query they came from: typing
something else, or clearing the field, puts the page's questions back under
it, so a stale preview never sits under a new question. Searching again
replaces the results, and "Start over" in the header clears everything.

Nothing about the user or page goes with the query. The page only decides
which questions are suggested.

## Reading articles in the panel

Articles open in the panel (`help-article-view.tsx`), not a new tab, so the
user stays in Admin: a picked FAQ question straight away, a result from its
preview or card. The header links out to the help center, and the maximize
button widens the panel over the page area right of Admin's sidebar, for long
articles. Under the article, "More from the help center" is one list of what
to read next: the article's own "Further reading" first (the docs team's
bookmark cards, lifted out of the body by `splitFurtherReading` so they don't
show twice; help articles open in the panel, other pages in a new tab), then
the search's other results, each once (a placeholder while a picked
question's search is still running). The article ends with "Not what you
were looking for?": a new search, or the support form; Back in the header
returns to the results. An earlier "Did this answer your question?" with Yes and No went:
Yes led nowhere, and the choices that matter are where to go next. Opened articles are marked "Read" in the
results and listed in what the support form sends.

`help-article-html.ts` prepares the HTML:

- **Sanitized** with DOMPurify: no scripts, event handlers, forms, inline
  styles or iframes, and only Ghost's own `kg-…` classes kept, so an article
  can't restyle or cover Admin.
- **Ids are prefixed** `user-content-` (`SANITIZE_NAMED_PROPS`), so they can't
  clash with Admin's or shadow document properties.
- **Links:** `#anchor` links scroll within the article; links to other help
  articles open in the panel when the article is in the loaded list; every
  other link opens in a new tab.
- **Ghost's interactive cards** rely on the help center's scripts, which don't
  run here, so they're rebuilt: toggles (FAQ items) as native disclosures, and
  video and audio with the browser's controls (and the video's thumbnail as its
  poster). Images zoom in a dialog when clicked.

## Contacting support

There's no "Contact support" button up front. The support team is offered
where a search or an article didn't do it: no results, the error state, and
"Contact support" at the end of an article. The form (`help-support.tsx`) starts from the
last search as the message (the subject is optional) and promises a reply
from the Ghost(Pro) support team within 24 hours on working days. Only what
the user writes is sent.

## Decisions and trade-offs

- **Search, not chat.** The results are the help center's own articles, in
  full, rather than a generated summary of them: nothing to get wrong, nothing
  to attribute, and the docs team's writing is what the user reads. The price
  is that the user reads rather than being told; the chat prototype
  (`poc-help-chat`) is the other side of that trade.
- **DocsBot's semantic search rather than the chat agent's sources.** The chat
  agent also returns sources, but only after generating an answer (10 to 20
  seconds) and under a conversation. The search endpoint returns the pages in
  a second or two with no state, which is what a search needs.
- **A picked question opens; a typed one previews.** A picked FAQ question is
  an exact match, so it opens in full at once. A typed search's first result
  is only the nearest page, so it's previewed, not opened: enough to judge,
  not enough to mislead.
- **Results come from the article list, not the chunks.** The chunks are
  fragments with page furniture in them; the list has the title and excerpt
  the docs team wrote. The cost is that pages missing from the list (anything
  that isn't a published post) can't be shown.
- **Suggestions and completions are questions.** The FAQ is already written as
  questions, so picking one reads as searching for it, and a completion is a
  question the help center can answer.
- **Completions replace what's under the field** rather than floating over
  it, so they never cover the suggestions or results.
- **Straight from the browser, with no key.** The simplest thing that works for
  a prototype; a key, or a hop through Ghost(Pro), would hide the bot ids.
- **Number keys pick suggestions** while nothing is typed: quick, but a
  question starting with one of those digits ("2FA…") picks a suggestion
  instead.
- **Ghost(Pro) only:** self-hosted sites would get no support form, so they
  keep the link they have.

## Still mocked

Search the code for `PROTOTYPE:`. In short:

- Sending to support: nothing is sent. Attached files keep only their names.
- The help center's API URL, hardcoded in `help-center.ts`, and its key,
  empty there until added locally.
- The DocsBot team and bot ids, hardcoded in `help-docsbot-search.ts` (a test
  bot).

## Known gaps

**Search**

- **A query with no good match still returns three articles.** Semantic
  search always finds the nearest pages; `autocut` in DocsBot's API, or a
  score threshold if one is exposed, would let the panel say "nothing close"
  instead.
- **Pages that aren't posts can't be results** (the FAQ topic page, for
  example), as the article list only has posts.
- **The FAQ is small** (39 questions, 35 of them question-shaped), so pages
  with no FAQ of their own borrow loosely related ones, and completions
  match words at their starts only.

**Reading**

- **Embeds (iframes, such as YouTube) are dropped.**
- **Links to help articles that aren't in the loaded list** (unpublished, or
  pages rather than posts) open in a new tab rather than the panel, and are
  left out of "More from the help center" when they come from an article's
  further reading.

**Accessibility and behaviour**

- Escape closes the panel when no completions are showing, even mid-search.
- Focus doesn't return to the Help button when the panel closes.
- While maximized, the page behind the panel is hidden but still reachable by
  keyboard.
- The number shortcut and "2FA…" (Decisions above).

**Tests**

- The pure modules are covered. The session (`use-help-search.ts`), the
  keyboard handling and the view switching aren't.

## Checking changes

- Unit tests (fixtures, no network): `pnpm exec vitest run src/help` in
  `apps/admin`, or `pnpm nx run @tryghost/admin:test:unit`.
- The panel needs the help center's public Content API key, which isn't in the
  repository: copy the `data-key` attribute from the source of any
  ghost.org/help page into `HELP_CENTER_API_KEY` in `help-center.ts`, and
  don't commit it. Without it, Help links out as before.
- Locally, the panel also only shows when Ghost's config has
  `hostSettings.billing.enabled: true` (for example
  `hostSettings__billing__enabled=true` in Ghost's environment). Without it,
  Help links out, which is the self-hosted case.
- Searching calls DocsBot's test bot from the browser; no key is needed. To
  try the API by hand:

  ```bash
  curl -X POST https://api.docsbot.ai/teams/HQWGXatyyGbuBqc5JOuT/bots/iUM7pu7wtd6BMYxBwpQU/search \
    -H 'Content-Type: application/json' \
    -d '{"query":"How do I connect Stripe?","top_k":10}'
  ```

- After the docs team reorganizes, check `getReferencedSlugs()` and
  `getReferencedTopics()` against the live Content API.
