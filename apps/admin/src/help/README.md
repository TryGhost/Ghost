# Help panel (prototype)

The Help panel tries to answer questions from the
[help center](https://ghost.org/help/) before they turn into support tickets.
It docks beside the page, suggests FAQ questions for the page the user is on,
completes questions as they type, answers through DocsBot, opens articles
inside Admin, and hands off to a support form that carries the context with it
when an answer didn't do it.

Answers come from [DocsBot](https://docsbot.ai), an agent trained on the help
center, through its [chat agent API](https://docsbot.ai/documentation/developer/chat-agent)
(`help-docsbot.ts`). The answer streams into the thread, and the help center
pages it drew on are matched back to the article list so they open in the
panel. Suggestions and completions as the user types come from the help
center's FAQ (`help-questions.ts`).

## Start here

- **Status:** a working prototype on the `poc-help` branch. It runs end to end
  against the live help center, but some parts are mocked (search the code for
  `PROTOTYPE:`), it has no feature flag, and its strings aren't translated. The
  [production checklist](#production-checklist) lists what's left.
- **Who sees it:** Ghost(Pro) sites only. Self-hosted sites keep the old Help
  link to the help center ([Who sees it](#who-sees-it)).
- **The one idea to keep:** Admin is only the experience layer. The help
  center owns the content, including which articles show on which Admin page
  ([The principle](#the-principle-admin-is-the-harness-the-help-center-owns-the-content)).
- **Reading order for the code:** `help-panel-provider.tsx` (the gate),
  `help-panel.tsx` (the shell), `use-help-conversation.ts` (what happens when
  someone asks), `help-docsbot.ts` (the DocsBot client), `help-questions.ts`
  (the FAQ: suggestions, completions and asking for a person), then
  `help-suggestions.ts` and `help-pages.ts` (what's suggested where).
- **Try it:** add the help center's API key locally first (it isn't in the
  repository), then see [Checking changes](#checking-changes).

## The principle: Admin is the harness, the help center owns the content

Admin holds no help copy. Every title, excerpt and article comes from the help
center at runtime, and so does the choice of which articles show on which Admin
page. Admin decides how to find them, how to rank them, and what to fall back
on when the help center hasn't said anything.

### Why the page-to-article mapping lives in tags, not in code

Which articles deflect which tickets is something we'll learn after launch,
week by week, from what support sees. If that mapping lived in Admin's code,
every change would need a code review and an Admin release, and sites on older
Admin versions would never get it. So the mapping is data in the help center:

- The docs or support team attaches an article to an Admin page, or to an
  account state, by adding an internal tag such as `#admin-posts` or
  `#admin-payment-failed` to it, in the help center's own Ghost Admin.
- Admin reads those tags at runtime through the Content API. A change shows in
  Admin within about 10 minutes (how long the article list is cached), with no
  deployment, on every Admin version that has the panel.
- Internal tags don't show on the help center itself, so readers never see
  them.

Admin's own per-page lists (`PAGE_ARTICLES` in `help-pages.ts`) are only a
fallback for pages nobody has tagged yet, so the panel is useful from day one.
Once a page has any tagged article, its fallback list is ignored.

The same idea could carry further and move more tuning out of code:

- **Search words:** a tag like `#admin-word-downgrade` on "Manage your
  Ghost(Pro) subscription" would let the docs team say which questions an
  article answers, instead of `SYNONYMS` in `help-search.ts`.
- **Site cards:** a tag like `#admin-card-subscription` instead of the slugs in
  `SITE_CARDS` (`help-site-card-kinds.ts`).

## Who sees it

Ghost(Pro) sites only. The panel exists to deflect Ghost(Pro) support tickets,
and its support form, account answers and billing data are all Ghost(Pro)'s.

`HelpPanelProvider` checks `hostSettings.billing.enabled` in the config (the
same check Admin's billing screen uses). On other sites it renders no provider,
so `useHelpPanel()` returns nothing and the Help items in the sidebar
(`nav-settings.tsx`) and account menu (`user-menu.tsx`) keep linking to the
help center as before. The same happens without the help center's API key
(`hasHelpCenterKey` in `help-center.ts`), which is also how a key from config
should behave on older Core that doesn't provide it.

Within Ghost(Pro), billing alerts and billing site cards only show to people
who can manage billing (the Owner), using `useCanAccessBilling`.

## Production checklist

### Before testing with staff

- [ ] **Feature flag.** Add a private flag (the
      `.agents/skills/add-private-feature-flag` skill) and require it in
      `HelpPanelProvider` alongside the Ghost(Pro) check.
- [ ] **Make "Contact support" real.** Ghost(Pro) support is email today (the
      billing app's Support tab shows support@ghost.org). The quickest real
      version keeps the form and opens a `mailto:support@ghost.org` draft with
      the message and, when "Attach this conversation" is on, the questions,
      answers, articles read and context (`getSupportContext`). A ticketing
      API can replace it later. Until then, `sendToSupport` in
      `use-help-conversation.ts` sends nothing, and the form promises a reply
      from the Ghost(Pro) support team within 24 hours on working days, which
      support should confirm.
- [ ] **Remove the mocks users would see.** The scheduled posts, domain and
      newsletter site cards show sample data (`PROTOTYPE_ACCOUNT` in
      `help-signals.ts`, and the cards say so). Hide them or read the real
      data, which Admin's APIs already have.
- [ ] **Own the DocsBot bot.** `help-docsbot.ts` hardcodes a test team and bot
      (`DOCSBOT_TEAM_ID`, `DOCSBOT_BOT_ID`), asked without a key straight from
      the browser. Move them into Ghost config, decide whether questions should
      go through Ghost(Pro) instead (a key would allow longer questions and
      model overrides), and point the bot at the production help center.
- [ ] **Decide what context DocsBot gets.** The page the question is asked
      from goes in the question itself (`withPageContext` in
      `use-help-conversation.ts`), as the API has no field for context. The
      role and Ghost(Pro) state stay in the browser for now.
- [ ] **Acceptance tests.** The panel opens on Ghost(Pro); a self-hosted site
      keeps the old Help link; the help center being down shows the error
      state.

### Before testing with customers

- [ ] **Measurement.** Use Admin's `trackEvent` for: panel opened, question
      asked, no results, article read, "Did this answer your question?" yes
      and no, and contact support after reading. Without these the test can't
      show whether tickets are deflected. Answer and article feedback is only
      kept in component state today (marked `PROTOTYPE:`).
- [ ] **Move the API URL and key into Ghost config** (`help-center.ts`), so
      they can change without an Admin release. Admin and Core deploy
      separately, so detect the config and keep working without it on older
      Core.
- [ ] **Agree the contract with the docs team** ([below](#the-contract-with-the-help-center)):
      the keys, tagging articles for the busiest pages, writing excerpts with
      the words people ask with, and a heads-up before renaming any slug Admin
      refers to.
- [ ] **Check the referenced slugs automatically.** `getReferencedSlugs()` and
      `getReferencedTopics()` in `help-contract.ts` list them; a scheduled job
      or test against the live Content API would catch renames.
- [ ] **Privacy review.** Opening the panel requests help.ghost.io from the
      browser, which sends the site's origin as the referrer. Each question,
      with the name of the Admin page it was asked from, goes to DocsBot
      (api.docsbot.ai), which keeps the conversation under an id the browser
      makes up (`newConversationId`). Nothing else about the user or site is
      sent.
- [ ] **Rollout.** Turning the flag on for chosen customer sites depends on
      how Ghost(Pro) enables Labs features per site.

### Before general release

- [ ] Translations: `t()` for every string (see the internationalization
      guide).
- [ ] The accessibility gaps under [Known gaps](#known-gaps).
- [ ] Tests for the conversation (`use-help-conversation.ts`: asking,
      follow-ups, picked articles, views) and the keyboard handling.
- [ ] Lead with more of what's broken: a failed newsletter send and theme
      errors, next to the failed payment and trial alerts.

Not needed first: an LLM, a support backend (email works), or self-hosted
support.

## How it fits together

The pure modules hold the rules and are unit tested; the hooks and components
around them are thin.

**Wiring (outside this folder)**

| File                                                                      | What it does                                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `layout/admin-layout.tsx`                                                 | Wraps the layout in `HelpPanelProvider` and places `<HelpPanel />` |
| `layout/app-sidebar/nav-settings.tsx`, `layout/app-sidebar/user-menu.tsx` | Help opens the panel, or links out when there's no provider        |
| `dunning/index.ts`                                                        | Exports `PayNowButton` for the payment site card                   |
| `index.css`                                                               | The `help-working-shimmer` utility for the working verb            |

**Rules (pure, unit tested)**

| File                      | What it owns                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `help-pages.ts`           | Page keys, their labels, route to key (`getPageKey`), each page's topics, fallback articles and fallback FAQ questions |
| `help-suggestions.ts`     | Account alerts (`getAccountAlert`) and the suggestion order (`getSuggestedArticles`)                                   |
| `help-search.ts`          | Search terms, word forms, the account question check and ranking (`rankHelpArticles`), kept for reference              |
| `help-questions.ts`       | The FAQ's questions, completing what's typed (`matchQuestions`), and spotting a request for a person (`wantsSupport`)  |
| `help-site-card-kinds.ts` | Which answers get a site card (`SITE_CARDS`), and billing cards for billing managers only                              |
| `help-contract.ts`        | Every key, slug and topic Admin relies on the help center for, in one place                                            |
| `help-article-html.ts`    | Makes an article's HTML safe and readable in the panel (DocsBot's answers go through it too)                           |
| `help-markdown.ts`        | Renders DocsBot's Markdown answers as HTML                                                                             |
| `help-format.ts`          | Small text helpers (`plural`, `inDays`, `getInitials`)                                                                 |
| `help-fixtures.ts`        | Test fixtures: `article()`, billing states                                                                             |

**Data**

| File                       | What it owns                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `help-center.ts`           | The help center client: the article list (excerpts, topics, `#admin-…` tags) and an article's HTML                                            |
| `help-docsbot.ts`          | The DocsBot client: asks the chat agent API and reads its server-sent events (searches, tokens, the answer with its sources)                  |
| `use-help-center-index.ts` | The article list query, loaded once when the panel opens and shared by everything                                                             |
| `help-signals.ts`          | What the panel knows about the user: page, role, site, timezone and Ghost(Pro) billing; the context shown with a question and sent to support |

**State**

| File                                               | What it owns                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `help-panel-provider.tsx`, `help-panel-context.ts` | Whether the panel is open, and the Ghost(Pro) gate                                                                                       |
| `use-help-conversation.ts`                         | The conversation: asking DocsBot, the streamed answer and its steps, feedback, reading articles, the support draft, and which view shows |
| `use-help-suggestions.ts`                          | Runs `getSuggestedArticles` for the current page over the loaded article list                                                            |
| `use-help-typeahead.ts`                            | Completions as the user types: the draft, the highlighted question, the keyboard, the combobox ARIA                                      |
| `use-help-panel-size.ts`                           | The docked width, and the maximized width (the page area right of Admin's sidebar)                                                       |

**Views**

| File                    | What it shows                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `help-panel.tsx`        | The shell: docked on desktop, a sheet on mobile, and the three views (conversation, article, support)                         |
| `help-welcome.tsx`      | The greeting and suggestions, or an error with a link to the help center                                                      |
| `help-messages.tsx`     | The thread: the question (and its context), the answer, its steps and sources                                                 |
| `help-typeahead.tsx`    | FAQ questions completing what's typed, above the composer                                                                     |
| `help-composer.tsx`     | The question box, with the chip for the page the question is asked from                                                       |
| `help-article-view.tsx` | An article read in the panel, ending with "Did this answer your question?"                                                    |
| `help-site-card.tsx`    | The look at the user's own site beside some answers, with a button to act on it                                               |
| `help-support.tsx`      | The message to support, which takes over the panel: starts from the first question, with the conversation attached by default |
| `help-panel-size.tsx`   | The maximize button                                                                                                           |
| `help-reveal.ts`        | The staggered entrance blocks use                                                                                             |

## Where the content comes from

The help center's pages are at ghost.org/help, but it's a Ghost site at
help.ghost.io, read through its public Content API (`help-center.ts`). The API
URL is hardcoded for now. The key is the public one the help center's own
search uses (the `data-key` attribute on its pages), but it's left empty in the
repository: add it locally, and don't commit it.

Like the help center's own search, the panel loads the whole article list once
when it opens (about 140 articles, ~25 KB in two requests) and searches it in
the browser. The Content API can only filter on titles and custom excerpts, not
the opening of an article's text, where much of what people search for
appears. Loading the list once also lets suggestions change instantly between
pages and matches show as the user types. An article's full HTML loads only
when it's opened.

Each article is parsed on its own, so one malformed article is skipped rather
than failing the list. Requests time out after 10 seconds and show the error
state.

- **Titles and URLs** are the articles' own (https only).
- **Excerpts** are the custom excerpt (the Excerpt field in post settings), or
  the article's first paragraph when it has none.
- **Search text** is Ghost's excerpt: the custom excerpt if there is one,
  otherwise the article's opening (up to 500 characters).
- **Topics** are the article's public tags; the first is its primary topic.
- **Admin keys** are its internal `#admin-…` tags (slug `hash-admin-…`).

## The contract with the help center

`help-contract.ts` lists everything Admin relies on the help center to have:

- **Keys** (`getAdminKeys`): tagging an article `#admin-<key>` attaches it to a
  page or account state. Never rename a key in Admin: every article tagged with
  it would silently stop showing. Adding keys is safe; they do nothing until
  something is tagged.
- **Slugs** (`getReferencedSlugs`): articles Admin falls back on or shows a site
  card for. If one is renamed or unpublished, its fallback or card silently
  disappears.
- **Topics** (`getReferencedTopics`): tag slugs Admin maps pages to.

### Attaching an article to an Admin page

1. Open the article in the help center's Ghost Admin.
2. Add the internal tag `#admin-<key>`, using a key from the tables below.
   **Put it after the article's topic tag**: Ghost only treats the first tag as
   the primary one if it's public, and the panel ranks by primary topic.
3. Within about 10 minutes, the page shows it.

A page shows at most three suggestions. Tagged articles are ordered featured
first, then most recently updated, so featuring an article moves it up.

### Page keys

| Key           | Admin page                                                                  | Topics it falls back on   | Fallback articles while none are tagged                                                                     |
| ------------- | --------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `home`        | Dashboard, and any page without its own key                                 | `getting-started`         | `site-setup`                                                                                                |
| `analytics`   | Analytics                                                                   | `growth-analytics`        | `native-analytics`, `post-analytics`                                                                        |
| `posts`       | Posts                                                                       | `publishing`              | `posts`, `publishing-content`                                                                               |
| `pages`       | Pages                                                                       | `publishing`              | `pages`, `build-a-custom-homepage`                                                                          |
| `editor`      | The editor                                                                  | `publishing`              | `using-the-editor`, `cards`                                                                                 |
| `tags`        | Tags                                                                        | `publishing`              | `tags`, `organizing-content`                                                                                |
| `members`     | Members, Members activity                                                   | `memberships`             | `member-management`, `import-members`                                                                       |
| `comments`    | Comments                                                                    | `memberships`             | `commenting`                                                                                                |
| `automations` | Automations                                                                 | `labs`                    | `automations-beta`, `welcome-emails`                                                                        |
| `network`     | Network                                                                     | `labs`                    | `social-web`                                                                                                |
| `newsletters` | Settings: newsletters                                                       | `newsletters`             | `setup-email-newsletters`, `email-delivery-tips`                                                            |
| `design`      | Settings: design, theme, navigation, announcement bar                       | `design`                  | `design-settings`, `installing-a-theme`                                                                     |
| `membership`  | Settings: portal, tiers, offers, Stripe, recommendations, embed signup form | `memberships`, `payments` | `setup-members`, `stripe`                                                                                   |
| `settings`    | Every other settings screen                                                 | `ghost-pro`, `advanced`   | `site-setup`                                                                                                |
| `ghost-pro`   | Ghost(Pro): billing, domain, backups, support                               | `ghost-pro`               | `manage-your-subscription`, `using-custom-domains`, `troubleshooting-payment-issues`, `turn-off-auto-renew` |
| `general`     | No page: the user took the page out of the question                         | none                      | none; the help center's featured articles                                                                   |

Keys, labels, topics and fallbacks are in `help-pages.ts`; routes map to keys
in `getPageKey`. The fallback articles above are the pages' reading lists; the
questions suggested on the welcome screen are `PAGE_QUESTIONS` in the same
file ([Suggestions](#suggestions)).

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

Before the user asks anything, up to three questions show for their page
(`getSuggestedArticles`). They're questions, not articles, so picking one reads
as asking it: they come from the help center's
[FAQ](https://ghost.org/help/topic/faq/), the articles tagged `faq` whose
titles are questions (`getFaqQuestions`; a few FAQ titles are topics, such as
"Modifying robots.txt", and are left out). In order:

1. **Account alert**, if one applies: the article tagged for it, or its
   fallback.
2. **Questions tagged `#admin-<page>`**, or the page's fallback questions
   (`PAGE_QUESTIONS` in `help-pages.ts`) while none are tagged. Tagged
   questions replace the fallbacks outright.
3. **The FAQ's featured questions**, then the rest of the FAQ, for any slot
   left.

The FAQ's articles carry no topic tag, only `faq`, so which questions suit
which page can't come from topics: `PAGE_QUESTIONS` was picked by hand from
the FAQ's 39 questions, as `PAGE_ARTICLES` was for articles. Tagging an FAQ
question `#admin-<page>` in the help center replaces it without a release.

When the user takes the page out of the question (the chip beside the
composer), questions tagged `#admin-general` stand in for step 2.

To see where a suggestion came from, inspect its row: `data-help-source` is
`alert`, `tagged`, `default`, `general`, `featured` or `faq`.

The keys 1, 2 and 3 pick the suggestions, as their number badges say, while
nothing is typed. Picking one asks it, with its article leading the answer's
sources.

## How a question is answered

A question goes to DocsBot's chat agent API (`askDocsBot` in `help-docsbot.ts`)
with `stream: true`, and the response is read as server-sent events:

1. **`tool_call` events** name the searches the agent runs against the help
   center (`search_documentation`, with its queries). Each becomes a step in
   the answer ("Searched the help center for …").
2. **`stream` events** carry the answer a token at a time. The thread renders
   the Markdown so far (`help-markdown.ts`, then `prepareArticleHtml` for
   safety and to mark links to help articles) with a caret after it.
3. **`lookup_answer`** (or `answer`, for a reply with no sources) ends it with
   the whole answer, `couldAnswer`, DocsBot's id for the answer, and its
   sources: the help center pages it drew on. Links to help articles in the
   answer's own text are taken out first (`extractHelpLinks`: a line that's
   only links goes, a link in a sentence becomes its text) and count as
   sources too, so each page shows once, as a card. `matchSources` maps each
   URL back to the article list by slug, so it shows as an article to read in
   the panel; pages not in the list link out. A suggestion the user picked
   leads the list. The best article's slug picks a site card, as before.

DocsBot keeps the conversation under a `conversation_id` the browser makes up
(`newConversationId`) and a new conversation gets a new one, so follow-ups need
no history from Admin. The page the question is asked from goes in the
question as a hint DocsBot is asked not to repeat; a picked FAQ question goes
alone. Questions are capped at 500 characters, the limit for unauthenticated
requests. `couldAnswer: false` shows the answer with an offer of the support
team beneath it; a failed request shows the error state.

A question that asks for a person ("can I talk to a human?", `wantsSupport`)
never reaches DocsBot: the panel replies with the way to the support form.

Links in an answer that point to help articles in the loaded list open in the
panel (`HelpAnswerText` in `help-messages.tsx`), like links inside articles.

## How the keyword search ranked articles (kept for reference)

`rankHelpArticles` in `help-search.ts` ranked the article list in the browser,
for answers before DocsBot and for article matches before completions came
from the FAQ. Nothing calls it now except its tests (`help-search.test.ts`
keeps the questions that shaped it) and `isAboutAccount`; it's kept in case
local ranking is wanted again, for example to match sources when the FAQ
can't.

1. **Words.** The question loses its stop words (how, my, the, another…).
2. **Forms of each word.** Each word also matches its -ize spelling (the help
   center writes "Customizing", people often write "customise"), and the help
   center's word for it where it uses a different one (`SYNONYMS`: cancel also
   matches "renew", as cancelling a plan is turning off auto-renew). A word's
   forms count once. Each pair of words is also tried joined, for names people
   split: "go daddy" finds GoDaddy. Words under 3 letters are only used joined.
3. **Matching.** Words match on rough stems, so "schedul" finds "scheduled"
   and "scheduling", and longer words match inside others, so "daddy" finds
   "GoDaddy" (but "sign" doesn't match "design"). Each article's title, topics
   and search text are checked.
4. **Account questions.** A question about the user's own Ghost(Pro) account
   (cancel, pause, plan, billing, refund… with no mention of members, tiers or
   offers) lifts Ghost(Pro) articles that match one of its account words, as
   those articles rarely use the words people ask with. "Cancel my account"
   leads with turning off auto-renew; "cancel a member's subscription" still
   finds the member article.
5. **Ranking.** Each word scores where it appears, then lifts apply:

   |                                                                         | Points | Constant               |
   | ----------------------------------------------------------------------- | ------ | ---------------------- |
   | Word in the title                                                       | 3      | `TITLE_SCORE`          |
   | Word in a topic name                                                    | 2      | `TOPIC_SCORE`          |
   | Word in the search text                                                 | 1      | `TEXT_SCORE`           |
   | About the user's page (tagged for it, or its primary topic)             | +1     | `PAGE_LIFT`            |
   | Ghost(Pro) article, for an account question                             | +2     | `ACCOUNT_LIFT`         |
   | Follow-up: names a word from the question before                        | +1     | `FOLLOW_UP_WORD_LIFT`  |
   | Follow-up: shares the primary topic of the question before's best match | +1     | `FOLLOW_UP_TOPIC_LIFT` |

   An article must match at least half the question's words
   (`MIN_COVERAGE`), so one ordinary word in common isn't an answer: "I think
   I got hacked" finds nothing, and offers a person instead. Lifts only apply
   to articles that already match. Results scoring under half the best
   (`RELATIVE_CUTOFF`) are dropped, and at most three show (`MAX_RESULTS`).
   The best match's excerpt leads the answer, with the articles beneath.

The weights were tuned by hand against a few dozen real questions on the live
help center, not against data. Measuring what people ask and open is how they
should be tuned for production. `help-search.test.ts` keeps the questions that
shaped them.

### Follow-ups

DocsBot keeps the thread, so "how do I customise it" after "how to connect
Stripe" is answered about Stripe. Admin sends no history and keeps no
follow-up state of its own.

### Completions as the user types

From 3 characters, the FAQ questions that continue what's typed show above the
composer (`matchQuestions` in `help-questions.ts`): every typed word has to
start a word in the question, the last one usually half-typed, and questions
that start the way the user did come first. Focus stays in the composer, which
is a combobox for screen readers: the arrow keys move through the questions,
Enter or Tab puts one in the composer in place of what was typed (Tab takes
the first when none is highlighted), and Escape hides them until the text
changes. The user sends the question from the composer, so they can still
change it. A question already in the composer whole isn't offered as its own
completion.

`rankHelpArticles` in `help-search.ts` ranked articles for this and for answers
before DocsBot and the FAQ took over; it's kept with its tests
(`help-search.test.ts`) for reference and the account-question check.

## Reading articles in the panel

Articles open in the panel (`help-article-view.tsx`), not a new tab, so the
user stays in Admin. The header links out to the help center, and the maximize
button widens the panel over the page area right of Admin's sidebar, for long
articles. The article ends with "Did this answer your question?", whose "No"
goes to the support form. Opened articles are listed in what the support form
sends.

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

## Site cards

Some answers show a card with the user's own site beside them, with a button
to where they can act on it. Cards are tied to the slug of the best answer
(`SITE_CARDS` in `help-site-card-kinds.ts`).

| Card            | Articles                                          | Data                  | Button                 |
| --------------- | ------------------------------------------------- | --------------------- | ---------------------- |
| Subscription    | `manage-your-subscription`, `turn-off-auto-renew` | Billing app           | Manage plan            |
| Payment failed  | `troubleshooting-payment-issues`                  | Billing app (dunning) | Pay now                |
| Scheduled posts | `publishing-content`                              | Sample data           | View scheduled posts   |
| Domain          | `using-custom-domains`                            | Sample data           | Set up a custom domain |
| Newsletter      | `setup-email-newsletters`, `delivering-emails`    | Sample data           | Newsletter settings    |

Billing cards only show to those who can manage billing. The payment card
shows the subscription card instead while no payment has failed. Until the
billing app reports (locally, without a matching Ghost(Pro) account), billing
cards still offer their button. Cards with sample data say "Sample data in this
prototype".

## Decisions and trade-offs

- **DocsBot for answers, local search for the rest.** DocsBot answers
  questions phrased any way at all and follows the thread, at a cost per
  question and with the question leaving the browser. Suggestions and matches
  as the user types stay a local search of the article list: instant, free and
  predictable. DocsBot's sources are matched back to that list so an answer
  still ends in articles the user can read in the panel.
- **Straight from the browser, with no key.** The simplest thing that works for
  a prototype. Unauthenticated requests cap questions at 500 characters and
  can't override the model; a key, or a hop through Ghost(Pro), lifts that.
- **The whole article list, searched locally,** rather than searching through
  the API: better matches and instant suggestions, for ~25 KB once per 10
  minutes. It stops scaling if the help center grows to thousands of articles.
- **Tags over code** for the page mapping: see
  [The principle](#the-principle-admin-is-the-harness-the-help-center-owns-the-content).
  The cost is a contract that can break silently; `help-contract.ts` makes it
  checkable.
- **Suggestions and completions are questions, not articles.** With an agent
  answering, what's offered up front should read as something to ask; the
  help center's FAQ is already written that way. Picking a suggestion asks it;
  picking a completion fills the composer, so the user stays in charge of what
  gets sent.
- **The support team is an escape valve, not a button.** There's no
  "Contact support" up front: it's offered where an answer didn't do it (a
  thumbs down, an answer DocsBot couldn't find, the error state, "No" at the
  end of an article) and when the user asks for a person in the composer
  (`wantsSupport`). The welcome screen says nothing about it. The form starts
  from the first question asked (the message, not the subject, which is
  optional) and attaches the conversation unless the user turns that off.
- **One place per source.** DocsBot links help articles in its text and lists
  them as sources; the panel shows each once, as a card to read in the panel,
  and takes the links out of the text (a link inside a sentence stays as
  words). Links to anything else stay inline.
- **Narrated steps.** The answer's steps are DocsBot's own searches and
  sources, so they show real work rather than a paced animation.
- **Number keys pick suggestions** while nothing is typed: quick, but a
  question starting with one of those digits ("2FA…") picks a suggestion
  instead.
- **Ghost(Pro) only:** self-hosted sites would get no support form and no
  account answers, so they keep the link they have.

## Still mocked

Search the code for `PROTOTYPE:`. In short:

- Sending to support: nothing is sent. Attached files keep only their names.
- The site state behind the scheduled posts, domain and newsletter cards
  (`PROTOTYPE_ACCOUNT` in `help-signals.ts`), and the SSL line on the domain
  card.
- Answer and article feedback, kept in component state only.
- The help center's API URL, hardcoded in `help-center.ts`, and its key,
  empty there until added locally.
- The DocsBot team and bot ids, hardcoded in `help-docsbot.ts` (a test bot),
  and the page context folded into the question.

## Known gaps

**Answers**

- **DocsBot's answers aren't rated back to DocsBot.** Thumbs up and down stay
  in component state; its rating API takes the id kept in
  `result.docsbotId`.
- **The Markdown renderer is small** (`help-markdown.ts`): paragraphs,
  headings, bold, italic, code, links and lists. Tables and images in an
  answer would show as text.

**Suggestions and completions**

- **The FAQ is small** (39 questions, 35 of them question-shaped), so pages
  with no FAQ of their own (Analytics, Network) borrow loosely related ones.
  Writing FAQ entries for the questions support gets most, and tagging them
  `#admin-<page>`, is the lever.
- **Completions match words at their starts only.** "cancel subscription"
  finds "How do I cancel member subscriptions", but "stop my subscription"
  finds nothing; DocsBot still answers it.
- **Ordering within a page is coarse:** featured first, then most recently
  updated. Ghost has no per-tag order.

**Reading**

- **Embeds (iframes, such as YouTube) are dropped.**
- **Links to help articles that aren't in the loaded list** (unpublished, or
  pages rather than posts) open in a new tab rather than the panel.

**Accessibility and behaviour**

- Escape closes the panel when no completions are showing, even mid-question;
  on mobile it closes the sheet even while completions show.
- `wantsSupport` is a regular expression: "How do I message my team" would
  offer support. Tune it against real questions, or ask DocsBot's own
  escalation classifier (`human_escalation`) instead.
- Unlinking a help article inside a sentence leaves words like "See the Stripe
  connection guide" without a link; the card beneath carries it.
- Focus doesn't return to the Help button when the panel closes.
- While maximized, the page behind the panel is hidden but still reachable by
  keyboard.
- On mobile, closing the sheet during the first load cancels it; it loads again
  on the next open.
- The number shortcut and "2FA…" (Decisions above).

**Tests**

- The pure modules are covered. The conversation (`use-help-conversation.ts`),
  the keyboard handling and the view switching aren't.

## Checking changes

- Unit tests (fixtures, no network): `pnpm exec vitest run src/help` in
  `apps/admin`, or `pnpm nx run @tryghost/admin:test:unit`.
- Asking a question calls DocsBot's test bot from the browser; no key is
  needed. To try the API by hand:

  ```bash
  curl -N -X POST https://api.docsbot.ai/teams/HQWGXatyyGbuBqc5JOuT/bots/iUM7pu7wtd6BMYxBwpQU/chat-agent \
    -H 'Content-Type: application/json' \
    -d '{"conversation_id":"00000000-0000-4000-8000-000000000001","question":"How do I connect Stripe?","stream":true}'
  ```

- The panel needs the help center's public Content API key, which isn't in the
  repository: copy the `data-key` attribute from the source of any
  ghost.org/help page into `HELP_CENTER_API_KEY` in `help-center.ts`, and
  don't commit it. Without it, Help links out as before.
- Locally, the panel also only shows when Ghost's config has
  `hostSettings.billing.enabled: true` (for example
  `hostSettings__billing__enabled=true` in Ghost's environment). Without it,
  Help links out, which is the self-hosted case.
- Billing alerts and cards also need the Ghost(Pro) billing app running
  locally (`hostSettings.billing.url`) with an account matching the local
  Owner's email. Without it, they show only their button.
- After the docs team reorganizes, check `getReferencedSlugs()` and
  `getReferencedTopics()` against the live Content API.
