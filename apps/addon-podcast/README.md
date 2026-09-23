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

Implementation is in progress. This first authoring slice provides show
configuration and episode metadata. Media uploads, gated player selection,
public/private audio/video feeds, and the V2 conversion helper follow in later
slices. Direct files will remain on Ghost storage; only feeds will be gated.
