---
name: ghost-theme-edit
description: Edit an open Ghost theme through the paired ghst canvas CLI and verify its live previews. Use for Ghost theme changes when the canvas editor is available.
---

Use the same mounted editor as the person. Theme edits stay in its draft until
the person publishes; keep the conversation with the agent.

Check `ghst canvas --help`. This spike requires the locally extended GHST build;
the published CLI does not yet include these commands. If unavailable, use the
local installation instructions in `apps/canvas-relay/README.md` from the Ghost
monorepo checkout. Do not silently replace the editor workflow with theme upload.

Pair once with `ghst --url SITE canvas connect`. Ask the person to open the printed
verification URL. After signing in if needed, their theme editor connects
automatically. Opening the link in an existing editor preserves its mounted draft.
The command waits for pairing and editor readiness. For asynchronous setup,
use `connect --no-wait`, then `ghst canvas wait`.

Pairing saves the site and credentials. Subsequent `ghst canvas` commands use that
saved connection: omit `--url` and staff credentials. Start by checking `canvas status`
when resuming work; do not create another pairing for an already connected editor.

Use `ghst canvas tools` once to discover available actions. Add `--json` for
structured results or `--schemas` for full tool definitions; ordinary source reads return clean text:

```sh
ghst canvas state
ghst canvas read default.hbs partials/components/navigation.hbs
ghst canvas read default.hbs > /tmp/default.hbs
ghst canvas edit --write default.hbs=/tmp/default.hbs assets/css/editorial.css=/tmp/editorial.css --set theme.background_image=false
```

Read relevant templates with `canvas read PATH...`, settings with `canvas settings`,
and file metadata with `canvas files`. Source reads return clean complete text;
the CLI handles pagination and remembers context/revision guards internally.
Use `write PATH --file FILE`, exact `replace PATH --old TEXT --new TEXT`, or one
atomic `edit --write PATH=FILE... --set NAME=VALUE...`. Prefer these native commands
over protocol JSON files. An unavailable remote action fails explicitly.
`edit` validates before accepting and waits for live delivery by default;
separate preflight is optional via `--dry-run`, rather than a routine extra call.
Successful rendering does not prove appearance: check desktop/mobile visually
through the available browser or ask the person to inspect the live canvas.

Keep authoring and rendered CSS consistent with the editor's declared build
capabilities. Use discovery/errors to establish patch constraints before promising
source compilation. Do not invent a build command or treat compiled CSS as source.

The CLI emits an operation ID before dispatch. After a timeout, lost reply or
`unknown` result, observe that ID with `ghst canvas result ID` and inspect state.
Do not automatically submit another edit or replay a mutation. Revision conflicts
require a fresh read and a patch based on the current shared draft.

Use `canvas frames`, `inspect FRAME`, `reveal FRAME`, `content list/select --kind KIND`,
`history list/restore --checkpoint ID` and `review`. Raw `--input` is an advanced
escape hatch. Publication requires the person to confirm
inside Ghost; the relay has no publish operation.

Keep exploration tied to the requested change. Start with the bound template,
the directly linked authoring stylesheet, and relevant settings. Prefer literal
searches constrained with `--path` to locate a rule before reading a large file.
Use compact `canvas tools` for capabilities; request `--schemas` only when a
specific argument or capability is unclear. Avoid reading every theme file,
dumping minified CSS, or inspecting every frame as routine discovery. Widen the
search when a missing dependency, validation error, or concrete visual problem
requires it. Apply a coherent patch once enough context is available, wait for
delivery, then check one desktop/mobile pair for the affected page. Inspect
individual elements or additional pages only when that check reveals a concern
or the change intentionally spans those pages.

Credentials stay in a private connection file. Do not paste its contents into
conversation. Closing the editor tab disconnects it. Revoke the session when requested with
`ghst canvas disconnect`. Offline editors cannot receive theme edits.
