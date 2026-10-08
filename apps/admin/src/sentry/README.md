# Sentry

Admin reports errors to Sentry only when the server configures client error
reporting, which adds `sentry_dsn` and `sentry_env` to the public `/site/`
response. Without a DSN nothing initialises and nothing is sent.

## Behaviour

- `useSentry()` runs once in `App`, before the signed-in/signed-out split, and
  initialises the SDK as soon as `/site/` loads. A second call while a client is
  live does nothing.
- Events carry `ghost@<version>` from `/site/` (major.minor) until a staff user
  signs in; after `/config/` loads they carry the full version.
- `admin_build` holds the commit sha of the Admin build the tab loaded, read
  from the `/admin/<sha>/assets/` path Ghost(Pro) serves it from. Admin and Core
  deploy separately, so it can differ from the release. It is absent when Ghost
  serves Admin itself and in development. Ember's events carry it too.
- Signed-in events carry the user's role as the only user field.
- The `route` tag holds the matched React route pattern (`/tags/:tagSlug`),
  never the path's ids or slugs.
- `editor_owner` and `auth_owner` (`react` or `ember`) say which implementation
  serves the editor and the auth screens. They are absent until that is decided
  and follow later changes. Ember's events carry them too, as both share one hub.
- `beforeSend` tags `shown_to_user` (default `false`) and `grammarly`, drops
  events already shown to the user and events about analytics requests, and
  replaces post/page ids in messages so they group together.
- Minified Lexical errors are tagged `lexical: true` with the loaded Koenig
  version, including ones the global error handlers catch. The post editor's
  reports also carry `koenig_instance`: `primary` for the visible instance,
  `secondary` for the hidden one.
- Handled errors are tagged `source: useHandleError`; API errors count as shown
  to the user, so only unexpected ones are sent.
- Outside `testing`, replays are buffered and sent with half of the errors.
  Lexical content and inputs are masked and media is blocked.
- While an Automations route shows, the body carries
  `data-sentry-automations-mask`, which masks everything. The first visit to
  Automations switches the buffer to a full recording for the rest of the page
  load, tagged `replay_area: automations`.

## Testing

`testing` disables replays and event deduplication. Acceptance specs serve a DSN
through a `browseSite` boot override and fake the ingest endpoint with
`fakeEndpoint`; any other request to `*.sentry.io` fails the test.
