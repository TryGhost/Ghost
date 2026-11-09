# Demo cards (spike)

A demo app that adds four editor cards to Ghost, from the app cards spike. Not for merging.

| Card           | Settings                                                         | On the site                                               | In email and RSS                          |
| -------------- | ---------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| Big number     | title, number, label, source                                     | static                                                    | the same figure                           |
| Event          | title, start, location, description, link                        | static                                                    | the same event                            |
| Podcast player | an episode link, looked up by the app's backend (`/api/resolve`) | snapshot, then a live frame with a player                 | artwork, title and a link to the post     |
| Chart          | a CSV import, chart type, columns, options                       | SVG snapshot, then a live frame with an interactive chart | a PNG the settings panel uploads to Ghost |

Card content is in German, as a demo for a German publication; the app's own text is English.

## Run it

```sh
pnpm --filter @tryghost/app-demo-cards dev
```

This builds the two editor bundles into `public/editor/` in watch mode (`render.js` runs in
Ghost's network-less Worker, `settings.js` in its hidden settings sandbox) and starts the dev
server on <http://cards.localhost:5181>, which serves:

- `/ghost-app.json`, signed by the SDK's Vite plugin with development keys it creates in
  `.ghost-app/` (git-ignored);
- `/editor/render.js` and `/editor/settings.js`;
- the live frames, `/frames/podcast.html` and `/frames/chart.html`;
- `POST /api/resolve`, the podcast lookup.

Then, with Ghost running in development and the `apps` labs flag on, open the install link the
dev server prints:

<http://localhost:2368/ghost/#/apps/install?manifest=http%3A%2F%2Fcards.localhost%3A5181%2Fghost-app.json>

## Trying the cards

- **Podcast player:** paste an NPR episode page or feed, such as
  `https://feeds.npr.org/510289/podcast.xml` (the newest episode of Planet Money). The manifest
  only lets snapshots load artwork from NPR's image hosts, so other podcasts' artwork won't show
  until their host is added to `image_origins`.
- **Chart:** import `demo-data.csv`, a year of made-up membership numbers. A new chart shows a
  small sample table until a CSV is imported.

## Tests

```sh
pnpm --filter @tryghost/app-demo-cards test
```
