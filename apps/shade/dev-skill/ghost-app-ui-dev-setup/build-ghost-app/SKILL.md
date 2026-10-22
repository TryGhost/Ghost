---
name: build-ghost-app
description: Connect a Ghost app to Ghost Admin with the app SDK, and serve its manifest and install link. Use when building a Ghost app, connecting it to Admin, writing its manifest or installing it.
---

# Build a Ghost app

A Ghost app runs as a full page in a frame inside Ghost Admin. Build it in this
folder, the one with `AGENTS.md`, as a Vite, React and TypeScript app with npm.
These steps make it show up in Admin. For its screens, use the
`build-ghost-app-ui` skill.

`npm create vite` won't scaffold into a folder that already has files without
`--overwrite`, which deletes them. Scaffold into a new subfolder, then move its
files up into this folder and remove the subfolder.

## Connect the app

1. **SDK.** `@tryghost/app-sdk` isn't on npm yet. Install it from the folder:
   `npm install ./vendor/tryghost-app-sdk.tgz`. It brings its one dependency,
   `@quilted/threads`.
2. **Fixed port.** In `vite.config.ts`, set
   `server: { port: 5190, strictPort: true }`. The install link depends on the
   port.
3. **Manifest.** Serve it as `public/ghost-app.json`, so it's at
   `http://localhost:5190/ghost-app.json`:

   ```json
   {
     "id": "org.example.<app-slug>",
     "name": "<App name>",
     "description": "<One sentence on what the app does.>",
     "author": { "name": "<Author>", "url": "https://example.com" },
     "accent_color": "#<six-digit hex>",
     "icon": { "name": "<icon-name>" },
     "surfaces": [{ "type": "admin_page", "url": "/" }]
   }
   ```

   Every field is required, `author.url` too, and Admin rejects fields it
   doesn't know. `icon.name` is any Lucide icon name in kebab case, such as
   `megaphone` or `layout-list`; Admin draws it on `accent_color`.

4. **Connect before rendering.** Admin keeps the frame hidden until the app
   calls `connect()`, and gives up after 10 seconds. In `src/main.tsx`, await
   it before rendering React:

   ```ts
   import { connect, GhostAppError } from '@tryghost/app-sdk'

   try {
     const ghost = await connect()
     // apply ghost.theme.mode (step 5), then render the app
   } catch (error) {
     if (error instanceof GhostAppError && error.code === 'not_framed') {
       // Opened outside Admin: render only a short "Open this app in Ghost Admin" message
     } else {
       // Render a short "Couldn't connect to Ghost" message with error.message
     }
   }
   ```

   Opened directly at `http://localhost:5190/`, the page isn't framed, so it
   shows only that message. That's expected.

5. **Theme.** `ghost.theme.mode` is `'light'` or `'dark'`, and
   `ghost.onThemeChange(theme => …)` fires when the publisher switches; it
   returns a function that unsubscribes. Apply the mode before the first render
   and follow changes. How Shade takes the mode is in the `build-ghost-app-ui`
   skill, at its "Light and dark theme" step.
6. **Install link.** With `npm run dev` running, the publisher installs the app
   from:
   `http://localhost:2368/ghost/#/apps/install?manifest=http%3A%2F%2Flocalhost%3A5190%2Fghost-app.json`

## Hand over

You can't open Ghost Admin yourself, so the publisher checks the app there.
When you're done, check that `npm run dev` starts on port 5190 and `npm run build`
passes, stop the dev server, and give them the install link with anything they
should check in Admin.
