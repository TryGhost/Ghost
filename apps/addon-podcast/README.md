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
Free media fields appear when **Free preview** is enabled; disabling it
keeps previously uploaded files for reuse. Episode and season numbers share a
row, and an empty episode title follows the current post title in the editor.
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

Email and ordinary Ghost RSS use a safe link back to the current post. The
link follows Ghost's body gating and contains neither media URLs nor private
feed credentials. Copying a card binds it to its new parent post.

## Converting V2 development content

`convert-v2.mjs` is an offline, workspace-only helper for the previous custom
post type spike. Stop Ghost before applying it and keep a full database backup.
Use this branch's current dependencies; do not roll back or rewrite the V2
migration history. The original V2 migration file remains unchanged on this
branch so databases that applied it can boot. The original 6.65 paths are also
retained for databases created before the spike was rebased onto main. This is
a forward-only development compatibility path: do not roll back these aliases,
since both versions refer to the same legacy tables and setting. Their tables/column are
compatibility artifacts; V3 has no runtime dependency on them. Extra V2 tables
and columns may remain in the development DB.

Create a private Knex configuration file pointing at the intended development
database. For SQLite:

```json
{
  "client": "better-sqlite3",
  "connection": { "filename": "/absolute/path/to/ghost.db" },
  "useNullAsDefault": true
}
```

MySQL uses `client: "mysql2"` and the database's connection object. Run from
`ghost/core` with the current source renderer:

```sh
pnpm exec node --conditions=source --import tsx ../../apps/addon-podcast/convert-v2.mjs \
  --database-config /absolute/path/to/knex-config.json

pnpm exec node --conditions=source --import tsx ../../apps/addon-podcast/convert-v2.mjs \
  --database-config /absolute/path/to/knex-config.json \
  --apply --backup /absolute/path/to/new-podcast-backup.json
```

The first command reports candidates without changing them. Applying writes an
exclusive, private backup of original posts and metadata before updating any
post, in one database transaction. Errors abort the transaction. A rerun skips
already converted posts. Keep the backup private because it includes body and
media data.

Each `podcast.episode` becomes one card at the start of its existing body. IDs,
UUIDs, slugs, status, access, dates, show references, files and existing body
content remain intact. Source metafields are retained for verification; the
helper never deletes them. Missing rendered bodies are generated from their saved source.
Legacy Mobiledoc is converted using Ghost's existing converter.

Players now follow body gating. Restricted posts without a preview divider no
longer offer an anonymous shell. The helper does not insert a divider or change
access. Historical post revisions remain historical; restoring one can remove
the new card. Production feed URL/GUID migration is outside this spike.

After restarting on this branch, refresh the installed podcast manifest while
preserving its `configuration`. Verify converted posts in the React editor,
website, public feed and a private feed before removing any V2 source metadata.
New development posts need no conversion: insert cards directly into ordinary
posts, choose shows, upload media and publish normally.
