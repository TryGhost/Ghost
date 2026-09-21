# keymaster (vendored)

Vendored copy of [madrobby/keymaster](https://github.com/madrobby/keymaster),
imported as a global (`key`) by `ember-cli-build.js`.

- **Commit:** [`f8f43dd`](https://github.com/madrobby/keymaster/commit/f8f43ddafad663b505dc0908e72853bcf8daea49)
  (`1.6.3`)
- **Licence:** MIT (see `MIT-LICENSE`)
- **Files:** `keymaster.js` is copied verbatim; do not edit it in place.

It was previously a `package.json` dependency pointing straight at the GitHub
repo, which made `pnpm install` fail in any environment without direct
github.com access and left a build-critical file outside the lockfile's
registry guarantees.

keymaster is on npm, but the last published version is `1.6.2` (2014). Admin
pins `1.6.3`, the repository's final commit, which was never published. The
only difference between them is a one-line fix in `unbindKey`: in `1.6.2` the
`key` variable is reassigned from the current shortcut only inside
`if (keys.length > 1)`, so an unmodified key in a comma-separated list reuses
the value left over from the previous iteration. Admin's only such list is
`'ctrl+s, command+s'`, where both entries carry a modifier, so the bug doesn't
bite today — but switching to the npm release would be a regression waiting for
the first shortcut like `'ctrl+s, enter'`. Vendoring the pinned commit keeps
current behaviour exactly.

To update, replace `keymaster.js` from the upstream repo and note the new commit
above.
