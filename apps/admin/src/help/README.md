# Support panel (prototype, form)

The Support panel is where a Ghost(Pro) user writes to the support team, and
it tries to answer them from the [help center](https://ghost.org/help/) while
they write. It docks beside the page, opens on a message box, offers the FAQ
questions for the page they're on under it ("You might be looking for"),
swaps them for the help center articles closest in meaning to what they've
written as they type (DocsBot's semantic search, FAQ answers nudged forward),
opens any of them inside Admin with the message kept as it was, and sends the
message from the form.

This is the **form** prototype, the third of three built to compare:

- `poc-help-form` (this branch): a support form first. The help center is
  offered beside the message, never instead of it.
- `poc-help-search`: a search. The user searches the help center through
  DocsBot and reads articles in the panel; support is where a search didn't
  do it.
- `poc-help-chat`: a chat. DocsBot's agent writes an answer, streamed into a
  thread, with follow-ups.

All three share the shell, the article reader and the FAQ suggestions; they
differ in what the panel opens on and what happens when the user asks.

## Start here

- **Status:** a working prototype. It runs against the live help center and
  DocsBot, but some parts are mocked (search the code for `PROTOTYPE:`), it has no feature
  flag, and its strings aren't translated. The
  [production checklist](#production-checklist) lists what's left.
- **Who sees it:** Ghost(Pro) sites only. Self-hosted sites keep the old Help
  link to the help center ([Who sees it](#who-sees-it)).
- **The one idea to keep:** Admin is only the experience layer. The help
  center owns the content, including which questions show on which Admin page
  ([The principle](#the-principle-admin-is-the-harness-the-help-center-owns-the-content)).
- **Reading order for the code:** `help-panel-provider.tsx` (the gate),
  `help-panel.tsx` (the shell), `use-help-session.ts` (the message and what's
  being read), `help-form.tsx` (the form), `use-help-related-questions.ts`
  and `help-docsbot-search.ts` (what shows under the message as the user
  writes), then `help-suggestions.ts` and `help-pages.ts` (what's suggested
  before they do).
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

Ghost(Pro) sites only. The panel is Ghost(Pro)'s support form, and its billing
alerts are Ghost(Pro)'s too.

`HelpPanelProvider` checks `hostSettings.billing.enabled` in the config (the
same check Admin's billing screen uses). On other sites it renders no provider,
so `useHelpPanel()` returns nothing and the sidebar (`nav-settings.tsx`) and
account menu (`user-menu.tsx`) show the old Help link to the help center
instead of Support. The same happens without the help center's API key
(`hasHelpCenterKey` in `help-center.ts`), which is also how a key from config
should behave on older Core that doesn't provide it.

Within Ghost(Pro), billing alerts only show to people who can manage billing
(the Owner), using `useCanAccessBilling`.

## Production checklist

### Before testing with staff

- [ ] **Feature flag.** Add a private flag (the
      `.agents/skills/add-private-feature-flag` skill) and require it in
      `HelpPanelProvider` alongside the Ghost(Pro) check.
- [ ] **Make sending real.** Ghost(Pro) support is email today (the billing
      app's Support tab shows support@ghost.org). The quickest real version
      opens a `mailto:support@ghost.org` draft with the message
      (`getSupportContext` in `help-signals.ts` lists the context a send could
      add, if ever wanted). A ticketing API can replace it later. Until then,
      `send` in `use-help-session.ts` sends nothing, and the form promises a
      reply from the Ghost(Pro) support team within 24 hours on working days,
      which support should confirm.
- [ ] **Own the DocsBot bot.** `help-docsbot-search.ts` hardcodes a test team
      and bot (`DOCSBOT_TEAM_ID`, `DOCSBOT_BOT_ID`), asked without a key
      straight from the browser. Move them into Ghost config, decide whether
      searches should go through Ghost(Pro) instead, and point the bot at the
      production help center. Each search costs 0.1 of DocsBot's AI credits,
      and the form searches once per pause in typing.
- [ ] **Acceptance tests.** The panel opens on Ghost(Pro); a self-hosted site
      keeps the old Help link; the help center being down shows the error
      state under the message, DocsBot being down leaves the page's
      questions, and the form still sends either way.

### Before testing with customers

- [ ] **Measurement.** Use Admin's `trackEvent` for: panel opened, question
      opened (and whether it was a page question or matched the message),
      and message sent. Without these the test can't
      show whether tickets are deflected.
- [ ] **Move the API URL and key into Ghost config** (`help-center.ts`), so
      they can change without an Admin release. Admin and Core deploy
      separately, so detect the config and keep working without it on older
      Core.
- [ ] **Agree the contract with the docs team** ([below](#the-contract-with-the-help-center)):
      the keys, tagging FAQ questions for the busiest pages, and a heads-up
      before renaming any slug Admin refers to.
- [ ] **Check the referenced slugs automatically.** `getReferencedSlugs()` and
      `getReferencedTopics()` in `help-contract.ts` list them; a scheduled job
      or test against the live Content API would catch renames.
- [ ] **Privacy review.** Opening the panel requests help.ghost.io from the
      browser, which sends the site's origin as the referrer. As the user
      writes, the message is sent to DocsBot (api.docsbot.ai) as the search
      query, half a second after typing pauses; nothing about the user or
      site goes with it, but the message itself may hold personal details.
      Decide whether that needs a notice, or a hop through Ghost(Pro).
- [ ] **Rollout.** Turning the flag on for chosen customer sites depends on
      how Ghost(Pro) enables Labs features per site.

### Before general release

- [ ] Translations: `t()` for every string (see the internationalization
      guide).
- [ ] The accessibility gaps under [Known gaps](#known-gaps).
- [ ] Tests for the session (`use-help-session.ts`: editing, reading,
      sending, resetting) and the view switching.

## How it fits together

The pure modules hold the rules and are unit tested; the hooks and components
around them are thin.

**Wiring (outside this folder)**

| File                                                                      | What it does                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `layout/admin-layout.tsx`                                                 | Wraps the layout in `HelpPanelProvider` and places `<HelpPanel />`    |
| `layout/app-sidebar/nav-settings.tsx`, `layout/app-sidebar/user-menu.tsx` | Support opens the panel; without a provider, Help links out as before |

**Rules (pure, unit tested)**

| File                     | What it owns                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `help-pages.ts`          | Page keys, their labels, route to key (`getPageKey`), each page's topics, fallback articles, fallback questions and words |
| `help-suggestions.ts`    | Account alerts (`getAccountAlert`) and the order of the page's questions (`getSuggestedArticles`)                         |
| `help-questions.ts`      | The FAQ's questions (`getFaqQuestions`), and nudging FAQ answers forward among search results (`nudgeFaqForward`)         |
| `help-docsbot-search.ts` | The DocsBot search client (`searchDocsBot`) and turning its hits into articles from the list (`toSearchResults`)          |
| `help-contract.ts`       | Every key, slug and topic Admin relies on the help center for, in one place                                               |
| `help-article-html.ts`   | Makes an article's HTML safe and readable in the panel, and lifts out its "Further reading"                               |
| `help-format.ts`         | Small text helpers (`plural`, `inDays`, `getInitials`)                                                                    |
| `help-fixtures.ts`       | Test fixtures: `article()`, billing states                                                                                |

**Data**

| File                       | What it owns                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `help-center.ts`           | The help center client: the article list (excerpts, topics, `#admin-…` tags) and an article's HTML                               |
| `use-help-center-index.ts` | The article list query, loaded once when the panel opens and shared by everything                                                |
| `help-signals.ts`          | What the panel knows about the user: page, role, site, timezone and Ghost(Pro) billing; the context a message to support carries |

**State**

| File                                               | What it owns                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `help-panel-provider.tsx`, `help-panel-context.ts` | Whether the panel is open, and the Ghost(Pro) gate                                                              |
| `use-help-session.ts`                              | The session: the message (draft, sending, sent), the article being read, and which view shows                   |
| `use-help-suggestions.ts`                          | Runs `getSuggestedArticles` for the current page over the loaded article list                                   |
| `use-help-related-questions.ts`                    | What's under the message: DocsBot's answers to it as it's written, or the page's questions while there are none |
| `use-help-panel-size.ts`                           | The docked width, and the maximized width (the page area right of Admin's sidebar)                              |

**Views**

| File                    | What it shows                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `help-panel.tsx`        | The shell: docked on desktop, a sheet on mobile, and the two views (form, article)                                 |
| `help-form.tsx`         | The greeting, message, "You might be looking for" under it, attach and send as one form, and the sent confirmation |
| `help-article-view.tsx` | An article read over the message, ending with "Didn't answer your question?" and the way back to the message       |
| `help-cards.tsx`        | The cards under an article for what to read next                                                                   |
| `help-panel-size.tsx`   | The maximize button                                                                                                |
| `help-reveal.ts`        | The staggered entrance blocks use                                                                                  |

## Where the content comes from

The help center's pages are at ghost.org/help, but it's a Ghost site at
help.ghost.io, read through its public Content API (`help-center.ts`). The API
URL is hardcoded for now. The key is the public one the help center's own
search uses (the `data-key` attribute on its pages), but it's left empty in the
repository: add it locally, and don't commit it.

The panel loads the whole article list once when it opens (about 140 articles,
~25 KB in two requests): it's where the questions under the message come from, and how
links between articles open in the panel. An article's full HTML loads only when it's opened.

Each article is parsed on its own, so one malformed article is skipped rather
than failing the list. Requests time out after 10 seconds and show the error
state.

- **Titles and URLs** are the articles' own (https only).
- **Excerpts** are the custom excerpt (the Excerpt field in post settings), or
  the article's first paragraph when it has none. The panel shows them on
  further-reading cards.
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

## What's under the message

Under the message, "You might be looking for" lists help center articles.
Which ones depends on what's written (`useHelpRelatedQuestions`):

**Before anything is written**, up to three questions for the page the user
is on (`getSuggestedArticles`), from the help center's
[FAQ](https://ghost.org/help/topic/faq/): the articles tagged `faq` whose
titles are questions (`getFaqQuestions`; a few FAQ titles are topics, such as
"Modifying robots.txt", and are left out). In order:

1. **Account alert**, if one applies: the article tagged for it, or its
   fallback.
2. **Questions tagged `#admin-<page>`**, or the page's fallback questions
   (`PAGE_QUESTIONS` in `help-pages.ts`) while none are tagged. Tagged
   questions replace the fallbacks outright.
3. **The FAQ's featured questions**, then the rest of the FAQ, for any slot
   left.

**As the user writes**, up to three help center articles closest in meaning
to the message, from DocsBot's
[semantic search API](https://docsbot.ai/documentation/developer/semantic-search-api)
(`searchDocsBot` in `help-docsbot-search.ts`), whose bot is indexed on the
help center. Half a second after typing pauses, and from four characters,
the message goes to DocsBot as the query; it answers with the chunks of text
nearest in meaning, and `toSearchResults` turns their pages into articles from
the loaded list, best first and each once. FAQ answers are then nudged
forward (`nudgeFaqForward` in `help-questions.ts`): each moves ahead of the
one article above it, since the FAQ is written to answer exactly these
messages, but no further, so a clearly better article still leads. While a
search runs the last answers stay (a small spinner beside the heading says
one is on its way), so the list settles rather than flickering as the user
types. The page's questions return when the message is cleared, finds no
article, or DocsBot can't be reached. FAQ answers show a question mark icon,
other articles a page.

An earlier version matched the message's words against titles and excerpts
in the browser. It was instant and private, but "emails landing in spam"
found nothing about deliverability; semantic search does.

The FAQ's articles carry no topic tag, only `faq`, so which questions suit
which page can't come from topics: `PAGE_QUESTIONS` was picked by hand from
the FAQ's 39 questions. Tagging an FAQ question `#admin-<page>` in the help
center replaces it without a release.

To see what's driving the list, inspect it: `data-help-source` on the `<ul>`
is `message` or `page`.

## Reading articles in the panel

Picking a question opens its article in the panel (`help-article-view.tsx`),
over the message, which is kept exactly as it was. The header links out to
the help center, and the maximize button widens the panel over the page area
right of Admin's sidebar, for long articles. Under the article, "More from
the help center" lists the article's own "Further reading" (the docs team's
bookmark cards, lifted out of the body by `splitFurtherReading` so they don't
show twice; help articles open in the panel, other pages in a new tab). The
article ends with "Didn't answer your question?" and "Back to your message",
which returns to the draft with focus in it. Sending is only ever from the
form, so the user sees what they're sending. Opened questions are marked
"Read" in the list under the message.

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

## Sending to support

The form is one block: a greeting by first name asking what we can help
with (the placeholder asks for what's happening and what was expected), the
message, "You might be looking for" right under it where
the eye is while typing (rows new to it rise in as what it offers changes),
then "Attach a file" and "Send to support" with a line naming the address the
reply goes to. No subject: the account is the signed-in one. Sending shows a confirmation in the form's
place, with Done (and a start-over icon in the header) clearing the message
for the next one. Only what the user writes is sent.

## Decisions and trade-offs

- **The form first.** The user came to write to support; the panel lets them,
  and puts the help center beside the message rather than in front of it.
  Nothing has to be searched before a ticket can be sent (Linear's contact
  form and Slack's help request page were the references).
- **DocsBot's semantic search rather than matching words.** A message is
  prose, not keywords: "emails landing in spam" has to find deliverability.
  The price is a request per pause in typing, and the message leaving the
  browser before it's sent (the privacy item in the checklist).
- **FAQ answers are nudged, not pinned.** The FAQ is written to answer exactly
  these messages, so an FAQ answer moves ahead of the one article above it;
  an article DocsBot ranks clearly higher still leads.
- **The last answers stay while the next are found.** Swapping to a loading
  state on every pause would make the list flicker with each sentence; a
  spinner beside the heading says more is coming.
- **The page's questions stay while nothing matches.** A message that matches
  no FAQ title keeps the page's questions rather than an empty list: the
  section stays useful and doesn't flash in and out as the user types.
- **The message is kept, always.** Reading an article never touches the draft,
  and Back returns to it with focus in the message. The draft lives in the
  session, so closing the panel keeps it too. An earlier version also offered
  "Send your message" at the end of an article; it went, so that sending
  always happens where the message is in view.
- **Ghost(Pro) only:** self-hosted sites have no Ghost(Pro) support team to
  write to, so they keep the link they have.

## Still mocked

Search the code for `PROTOTYPE:`. In short:

- Sending to support: nothing is sent. Attached files keep only their names.
- The help center's API URL, hardcoded in `help-center.ts`, and its key,
  empty there until added locally.
- The DocsBot team and bot ids, hardcoded in `help-docsbot-search.ts` (a test
  bot).

## Known gaps

**Search**

- **A message with no good match still returns three articles.** Semantic
  search always finds the nearest pages; `autocut` in DocsBot's API, or a
  score threshold if one is exposed, would let the panel fall back to the
  page's questions instead.
- **Pages that aren't posts can't be offered** (the FAQ topic page, for
  example), as the article list only has posts.
- **The nudge depends on the `faq` tag.** Question-titled articles outside
  the FAQ ("How do I improve my email deliverability?") aren't nudged.

**Reading**

- **Embeds (iframes, such as YouTube) are dropped.**
- **Links to help articles that aren't in the loaded list** (unpublished, or
  pages rather than posts) open in a new tab rather than the panel, and are
  left out of "More from the help center" when they come from an article's
  further reading.

**Accessibility and behaviour**

- Escape closes the panel, including from inside the message.
- Focus doesn't return to the Support button when the panel closes.
- While maximized, the page behind the panel is hidden but still reachable by
  keyboard.

**Tests**

- The pure modules are covered. The session (`use-help-session.ts`) and the
  view switching aren't.

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
- Writing in the form calls DocsBot's test bot from the browser; no key is
  needed. To try the API by hand:

  ```bash
  curl -X POST https://api.docsbot.ai/teams/HQWGXatyyGbuBqc5JOuT/bots/iUM7pu7wtd6BMYxBwpQU/search \
    -H 'Content-Type: application/json' \
    -d '{"query":"My newsletter emails are landing in spam","top_k":10}'
  ```

- After the docs team reorganizes, check `getReferencedSlugs()` and
  `getReferencedTopics()` against the live Content API.
