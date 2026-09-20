# Member location map spike

Question: can the member detail header borrow the pale geographic backdrop from
`ghost-editorial` using the location data Ghost already holds?

This experiment is captured on `codex/member-location-map-spike`. No design has
been selected for production. A (the wide backdrop) is the closest to the reference.

## Try it

With the usual `pnpm dev` running, append `&variant=A` to an existing member URL
that already has a query string, or `?variant=A` otherwise. The parameter belongs
inside the hash route, for example `/ghost/#/members/<id>?variant=A`.

- A: wide map backdrop with the name and actions below the geography.
- B: split header with the map to the right.
- C: compact strip with a small map backdrop.

The floating arrows switch variants and preserve other query parameters. Keyboard
left/right arrows also switch when focus is outside controls. Removing `variant`
restores the existing header. The experiment only activates in development.

A standalone sample-data preview is available when the site's configured origin
cannot be reached. Run from the repository root:

```sh
pnpm --dir apps/admin exec vite --config vite.member-map-prototype.ts
```

Open [the sample preview](http://127.0.0.1:5188/member-map-preview.html#/?variant=A).
It uses the same header component, with controls for UK, US, Singapore, unknown
location, and light/dark themes. It makes no member API requests or writes. Its
form is a local sample, not the full member editor. The standalone server binds
only to loopback and does not require Docker.

## Findings

- The reference uses Leaflet with CARTO raster tiles and hardcoded city coordinates.
  During inspection its tiles displayed "API key required" watermarks.
- Ghost's geolocation service currently stores `country`, `country_code`, and
  `region`. It discards city and coordinates from its upstream lookup. Existing
  member records therefore cannot reliably support the reference's city marker.
- This spike highlights a country outline from the already-installed
  `@svg-maps/world` dataset. No new dependency, API key, geocoder, tile request, or
  backend change is needed. No member location is sent to another service.
- Unknown, missing, malformed, and unrecognized country data render a compact
  "Location unavailable" header, without a made-up location.
- These are country outlines, not street maps. Overseas territories and widely
  separated islands can make a country's bounding box very large. Atlas detail,
  geographic coverage, payload size, and lazy loading need review before shipping.
- City or region-level maps would be a separate follow-up: establish the desired
  precision, storage and historical-data strategy, then select a map provider.

## Validation and limits

The isolated preview was inspected at desktop and mobile widths, in light and
dark themes, with known and unknown locations and keyboard variant navigation.
Admin TypeScript and focused lint checks passed. The existing member detail
formatting, navigation, and edit suites passed (82 tests).

`pnpm check` passed formatting and repository linting, but its test phase had
failures/timeouts outside this spike, including Unsplash acceptance tests and
Ghost email-related tests. The run was stopped after these failures; it is not a
green full-suite result. The two Admin files that timed out passed all 26 tests
when rerun on their own.

The requested Tailscale URL was unreachable (Tailscale had no serve config).
The local Ghost instance rejected localhost API calls because its configured
origin was the Tailscale host. The real member route integration is implemented,
but checking this particular member in the authenticated app remains outstanding.

## Map attribution

Map geometry is from MapSVG, via `@svg-maps/world` by Victor Cazanave, under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The source package credits [MapSVG's world map](https://mapsvg.com/maps/world).
This prototype changes the colors, viewport, and highlighted country.
