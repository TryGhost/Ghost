# Podcasts add-on spike

Podcast cards belong to ordinary Ghost posts. Each card chooses a show from
app configuration; card props are saved through the normal React editor body.
There is no custom post type, episode sidebar, or separate episode save path.

## Local development

```sh
pnpm --filter @tryghost/addon-podcast build
pnpm --filter @tryghost/addon-podcast serve
```

Enable the Add-ons and React editor experiments, then install
`http://localhost:4655/manifest.json` through Apps. Add shows on the Podcasts
app page, then insert **Podcast episode** from the post editor's slash menu.
Several cards can belong to one post, and each card can select a different show.

For website playback, start the provider with `GHOST_URL` and the server-only
`GHOST_ADMIN_API_KEY` from a custom integration. Keep the key out of manifests
and browser bundles. The provider rereads the published post and Ghost's current
card-access decision on every request; conflicting content revisions fail closed.
After rebuilding, refresh the installed manifest so its runtime integrity matches.

Card settings provide full and free audio/video uploads. Ghost owns file
selection, progress, and storage; only a media reference enters card props.
Closing settings keeps an active upload running. Removing the card or leaving
the editor discards its late result. Media changes use the normal post save flow.

The player supports full/free audio and video, uses the current post title when
the card has no title, and opens Ghost Portal for sign-in. A restricted post's
preview divider controls whether its card can offer a free version. Hidden cards
remain inaccessible through direct player requests. Member-session refreshes
replace the iframe and discard old responses.

## Podcast feeds

Each show exposes `/feeds/<show-id>/audio.xml` and
`/feeds/<show-id>/video.xml`. Set `PROVIDER_URL` to the provider's externally
reachable base URL when it differs from `http://localhost:4655`. The player's
**Subscribe to podcast** control provides these links, personalised with the
current member's signed credential after sign-in. Treat private URLs as secrets.

Feeds query ordinary published posts containing podcast cards and respect each
card's actual visibility, including public previews. Every eligible card emits
one item per configured format. Membership and content changes apply on the
next request; failures return an error instead of a partial feed. Responses are
uncached. Direct files remain public on Ghost storage; only feeds are gated.

Implementation is in progress. Portable post links and the V2 conversion helper
follow in later slices.
