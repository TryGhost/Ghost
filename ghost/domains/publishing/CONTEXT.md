# Publishing

The publishing domain owns writing and presenting content: posts, pages and the
cards inside them.

Only one part of it has moved here so far.

## Language

- **Embed**: a card that shows another site's content inside a post, built from
  that site's oEmbed data.
- **Bookmark**: a card that shows a link with the title, description, icon and
  thumbnail read from the page it points at.
- **External page description**: what Ghost can learn about a URL on another
  site: its oEmbed data, or failing that its metadata.

## What it owns

- Describing an external page: finding its oEmbed provider, fetching the page,
  reading its metadata, and storing its thumbnail and icon. This is the oEmbed
  service, in `transition/services/oembed`.

## What other domains use

- `actions/describe-external-page.action.ts` and
  `actions/fetch-external-page-html.action.ts`. Network uses them to read the
  metadata of a recommended site. Mentions, still in `ghost/core`, uses the
  service in `transition/` directly.
