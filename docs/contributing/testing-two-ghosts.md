# Testing With Two Ghosts

`pnpm dev:multi` starts everything `pnpm dev` does plus a second Ghost behind the
front door. Both use the same database, Redis, Mailpit and content folder. It
also turns on the public post and tag caches and moves the image size cache, all
in Redis, so both Ghosts share them. This shows what breaks when something is
kept in one process's memory. `pnpm dev` still runs one Ghost.

## Run two Ghosts

Run:

```bash
pnpm dev:multi
```

The second Ghost uses the first's port plus 1000. It waits for the first to
answer, so one Ghost sets up the database and runs any migrations. The front door
holds requests until both answer, including after a saved file restarts them.
If that save adds a migration, both Ghosts try to run it and one stops with a
lock error until the next save, so requests wait until then.

## Choose a Ghost

The front door sends a request to the Ghost its `X-Ghost-Target` header names,
`1` or `2`, and answers `400` for any other value. Without the header the two
Ghosts take turns, which makes a problem come and go as it would across several
Ghosts. Each response names the Ghost that answered, `1` or `2`, in its
`X-Ghost-Served-By` header. For example, to read the site's settings from the
second Ghost in the main checkout:

```bash
curl -i -H 'X-Ghost-Target: 2' http://localhost:2368/ghost/api/admin/site/
```
