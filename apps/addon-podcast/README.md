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

Card settings provide full and free audio/video uploads. Ghost owns file
selection, progress, and storage; only a media reference enters card props.
Closing settings keeps an active upload running. Removing the card or leaving
the editor discards its late result. Media changes use the normal post save flow.

Implementation is in progress. Show configuration, episode metadata, uploads,
and safe public snapshots are available. Gated player selection, public/private
audio/video feeds, and the V2 conversion helper follow in later slices. Direct
files remain on Ghost storage; only feeds will be gated.
