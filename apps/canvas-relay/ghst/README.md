## Canvas relay local extension

This checkout includes an unpublished local Ghost canvas extension. Open the theme
editor, run `ghst --url SITE canvas connect`, then open the printed link.
The editor connects automatically after sign-in. Its pairing link survives a page
reload; closing the tab disconnects it. Use `connect --no-wait` followed by
`canvas wait` for asynchronous pairing.

Pairing saves the site connection. Omit `--url` and staff credentials from later
commands; `ghst canvas status` checks the saved connection when resuming work.

Use ordinary commands to work on the open editor's draft:

```sh
ghst canvas files
ghst canvas read default.hbs partials/components/navigation.hbs
ghst canvas read partials/components/navigation.hbs > /tmp/navigation.hbs
ghst canvas search gh-navigation --path assets/built/screen.css
ghst canvas settings
ghst canvas write partials/components/navigation.hbs --file /tmp/navigation.hbs
ghst canvas replace default.hbs --old 'old fragment' --new 'new fragment'
ghst canvas edit --write default.hbs=/tmp/default.hbs assets/css/editorial.css=/tmp/editorial.css --set theme.background_image=false
ghst canvas frames
ghst canvas inspect home-desktop
ghst canvas reveal home-mobile
ghst canvas content list --kind post
ghst canvas content select --kind post --content-id POST_ID
ghst canvas history list
ghst canvas history restore --checkpoint CHECKPOINT_ID
ghst canvas review
```

Source reads return clean complete text; pagination and batching are internal.
`--json` returns structured data. Every successful read remembers the workspace,
revision and content generation privately alongside the connection file. Edits use
that revision, reject conflicts, validate atomically and wait for preview delivery
by default. Read current files again after a conflict; mutations never retry
automatically. `--expected-revision` adds an explicit revision guard. Use one write
per theme file in a patch. `--set NAME=VALUE` interprets `true`, `false` and `null`;
other values are strings. Settings must stay visible under the resulting settings.

`--dry-run` checks a candidate without adoption. `--no-wait` returns after
acceptance. Successful rendering does not verify appearance; check desktop/mobile
in the browser. Theme builds and native screenshot capture are unavailable.

The CLI checks the remote's capabilities and reports unavailable actions clearly.
`canvas tools` summarizes actions, screenshot/build limitations and linked CSS;
`--json` returns this compact summary. Full schemas require `canvas tools --schemas`.
Advanced protocol access remains available through `--input FILE` on the eight
remote actions. Do not mix JSON input with ordinary arguments.

All commands accept `--connection FILE` (default: `~/.config/ghst/canvas.json`).
Use `status` for connectivity and `result ID` to observe an uncertain operation.
The mutation's operation ID is printed before dispatch; never repeat an edit after
a lost reply. Use `disconnect` to revoke a session. Publication remains a human
action inside Ghost.

Keep discovery focused: read the requested page's template, linked authoring CSS,
and relevant settings. Use `search QUERY --path FILE` before reading large files.
Expand only to resolve missing dependencies, validation failures or a concrete
visual concern. A routine edit needs one coherent patch, its delivery result,
and a desktop/mobile check of the affected page.
