# Help panel (prototype)

The Help panel tries to answer questions from the
[help center](https://ghost.org/help/) before they turn into support tickets.
It docks beside the page, suggests articles for the page the user is on,
searches the help center as they type and ask, opens articles inside Admin,
and hands off to a support form that carries the context with it.

There is no LLM. Every answer is a keyword search of the help center, ranked in
the browser.

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
  someone asks), `help-search.ts` (how answers are found), then
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
      the subject, message and context filled in. A ticketing API can replace
      it later. Until then, `sendToSupport` in `use-help-conversation.ts` sends
      nothing and makes up a reference.
- [ ] **Remove the mocks users would see.** The scheduled posts, domain and
      newsletter site cards show sample data (`PROTOTYPE_ACCOUNT` in
      `help-signals.ts`, and the cards say so). Hide them or read the real
      data, which Admin's APIs already have.
- [ ] **Decide on the pacing.** Each search step is held for at least 700ms
      (`MIN_STEP_DURATION` in `use-help-conversation.ts`) so it reads as work
      being done. The search itself takes a few milliseconds. Keep it, shorten
      it or drop it.
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
      browser, which sends the site's origin as the referrer. Questions never
      leave the browser.
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

| File                      | What it owns                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `help-pages.ts`           | Page keys, their labels, route to key (`getPageKey`), each page's topics and fallback articles |
| `help-suggestions.ts`     | Account alerts (`getAccountAlert`) and the suggestion order (`getSuggestedArticles`)           |
| `help-search.ts`          | Search terms, word forms, the account question check and ranking (`rankHelpArticles`)          |
| `help-site-card-kinds.ts` | Which answers get a site card (`SITE_CARDS`), and billing cards for billing managers only      |
| `help-contract.ts`        | Every key, slug and topic Admin relies on the help center for, in one place                    |
| `help-article-html.ts`    | Makes an article's HTML safe and readable in the panel                                         |
| `help-format.ts`          | Small text helpers (`plural`, `inDays`, `getInitials`)                                         |
| `help-fixtures.ts`        | Test fixtures: `article()`, billing states                                                     |

**Data**

| File                       | What it owns                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `help-center.ts`           | The help center client: the article list (excerpts, topics, `#admin-…` tags) and an article's HTML                                            |
| `use-help-center-index.ts` | The article list query, loaded once when the panel opens and shared by everything                                                             |
| `help-signals.ts`          | What the panel knows about the user: page, role, site, timezone and Ghost(Pro) billing; the context shown with a question and sent to support |

**State**

| File                                               | What it owns                                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `help-panel-provider.tsx`, `help-panel-context.ts` | Whether the panel is open, and the Ghost(Pro) gate                                                                            |
| `use-help-conversation.ts`                         | The conversation: asking, the narrated steps, follow-ups, feedback, reading articles, the support draft, and which view shows |
| `use-help-suggestions.ts`                          | Runs `getSuggestedArticles` for the current page and adds each suggestion's reason                                            |
| `use-help-typeahead.ts`                            | Matches as the user types: the draft, the highlighted match, the keyboard, the combobox ARIA                                  |
| `use-help-panel-size.ts`                           | The docked width, and the maximized width (the page area right of Admin's sidebar)                                            |

**Views**

| File                    | What it shows                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `help-panel.tsx`        | The shell: docked on desktop, a sheet on mobile, and the three views (conversation, article, support) |
| `help-welcome.tsx`      | The greeting and suggestions, or an error with a link to the help center                              |
| `help-messages.tsx`     | The thread: the question (and its context), the answer, its steps and sources                         |
| `help-typeahead.tsx`    | Matches above the composer                                                                            |
| `help-composer.tsx`     | The question box, with the chip for the page the question is asked from                               |
| `help-article-view.tsx` | An article read in the panel, ending with "Did this answer your question?"                            |
| `help-site-card.tsx`    | The look at the user's own site beside some answers, with a button to act on it                       |
| `help-support.tsx`      | The message to support, which takes over the panel                                                    |
| `help-panel-size.tsx`   | The maximize button                                                                                   |
| `help-reveal.ts`        | The staggered entrance blocks use                                                                     |

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
in `getPageKey`.

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

Before the user asks anything, up to three suggestions show for their page
(`getSuggestedArticles`):

1. **Account alert**, if one applies: the article tagged for it, or its
   fallback.
2. **Articles tagged `#admin-<page>`**, or the page's fallback articles while
   none are tagged. Tagged articles replace the fallbacks outright, so the help
   center's choice is never mixed with Admin's.
3. **The page's topics**, filling any slot left: articles whose primary topic
   is one of the page's.
4. **The help center's featured articles**, for any slot still left (Network,
   for example, has one article of its own).

When the user takes the page out of the question (the chip beside the
composer), articles tagged `#admin-general` stand in for steps 2 and 3. Until
any are tagged, the featured articles fill in; those are chosen for the help
center's homepage (getting started), not the questions support gets most, so
`#admin-general` is the place for those. Consider keeping sensitive topics such
as cancelling out of it: they'd be suggested to everyone who opens Help, and
search finds them as soon as someone asks.

To see where a suggestion came from, inspect its row: `data-help-source` is
`alert`, `tagged`, `default`, `topic`, `general` or `featured`.

The keys 1, 2 and 3 pick the suggestions, as their number badges say, while
nothing is typed. Picking a suggestion asks it as a question, so the article
leads an answer with related articles beneath it.

## How an answer is found

`rankHelpArticles` in `help-search.ts` ranks the article list in the browser,
for questions (`use-help-conversation.ts`) and for matches as the user types
(`use-help-typeahead.ts`).

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

   Lifts only apply to articles that already match. Results scoring under half
   the best (`RELATIVE_CUTOFF`) are dropped, and at most three show
   (`MAX_RESULTS`). The best match's excerpt leads the answer, with the
   articles beneath.

The weights were tuned by hand against a few dozen real questions on the live
help center, not against data. Measuring what people ask and open is how they
should be tuned for production. `help-search.test.ts` keeps the questions that
shaped them.

### Follow-ups

Each question quietly carries the one before it that found something
(`getFollowUp`), so "how do I customise it" after "how to connect Stripe" leads
with "Customizing Stripe". The earlier question only reorders what the new one
finds and never answers on its own, so changing the subject drops it. It isn't
shown in the question, but is listed in the question's context (its chevron)
and in the answer's steps.

### Matches as the user types

From 3 characters, the articles the text matches so far show above the
composer, ranked the same way (with the follow-up). Focus stays in the
composer, which is a combobox for screen readers: arrow keys move through the
matches, Enter opens one, and Escape hides them until the text changes. A
half-typed word matches the words it starts ("stri" finds Stripe). Opening a
match clears the composer.

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

- **No LLM.** Answers are the help center's own words, nothing the user types
  leaves the browser, results are predictable and testable, and there's no
  cost per question. The price is weaker matching for questions phrased far
  from the articles' words; tags, excerpts and `SYNONYMS` are the levers for
  that.
- **The whole article list, searched locally,** rather than searching through
  the API: better matches and instant suggestions, for ~25 KB once per 10
  minutes. It stops scaling if the help center grows to thousands of articles.
- **Tags over code** for the page mapping: see
  [The principle](#the-principle-admin-is-the-harness-the-help-center-owns-the-content).
  The cost is a contract that can break silently; `help-contract.ts` makes it
  checkable.
- **Picking a suggestion asks it; picking a match opens it.** A suggestion is
  something the user hasn't asked, so it's shown as an answer with related
  articles. A match is a reply to what they typed, so it opens straight away.
- **Paced steps.** The answer narrates its steps with a minimum duration. It
  reads as work being done, but it's a delay the search doesn't need
  (checklist).
- **Number keys pick suggestions** while nothing is typed: quick, but a
  question starting with one of those digits ("2FA…") picks a suggestion
  instead.
- **Ghost(Pro) only:** self-hosted sites would get no support form and no
  account answers, so they keep the link they have.

## Still mocked

Search the code for `PROTOTYPE:`. In short:

- Sending to support: nothing is sent and the reference is made up. Attached
  files keep only their names.
- The site state behind the scheduled posts, domain and newsletter cards
  (`PROTOTYPE_ACCOUNT` in `help-signals.ts`), and the SSL line on the domain
  card.
- Answer and article feedback, kept in component state only.
- The help center's API URL, hardcoded in `help-center.ts`, and its key,
  empty there until added locally.

## Known gaps

**Search**

- **Only the opening of an article is searched**: the up to 500 characters
  Ghost keeps as its excerpt, or the custom excerpt when there is one, as with
  the help center's own search. Excerpts written with the words people ask with
  fix it article by article; loading articles' full text (much larger) would
  fix it everywhere.
- **Some account questions rank weakly.** "Downgrade my plan" leads with how
  plans are calculated rather than "Manage your Ghost(Pro) subscription". A
  custom excerpt, or the search-word tags above, would fix it.
- **Ordering within a page is coarse:** featured first, then most recently
  updated. Ghost has no per-tag order.

**Reading**

- **Embeds (iframes, such as YouTube) are dropped.**
- **Links to help articles that aren't in the loaded list** (unpublished, or
  pages rather than posts) open in a new tab rather than the panel.

**Accessibility and behaviour**

- On mobile, Escape closes the whole sheet even while matches are showing.
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
