# Member location map spike

Question: can the member detail header borrow the pale geographic backdrop from
`ghost-editorial` using the location data Ghost already holds?

This experiment is captured on `codex/member-location-map-spike`. The wide map
backdrop (originally variant A) is the selected spike design. The alternative
layouts and their switcher have been removed; this remains a development experiment.

## Try it

Enable **Settings → Labs → Private features → Member location maps**
(`memberLocationMap`). The toggle appears when developer experiments are enabled.
The flag defaults off and works in both development and production builds.

When disabled or absent from an older backend, member pages retain the original
breadcrumb, sidebar identity, and header spacing. When enabled, the flag controls
the entire profile header, country/state map, and 28px vertical header padding
for unknown locations. The map module and geometry are loaded only when enabled. A local error boundary
keeps the header controls usable if the map chunk fails to load.
New-member pages keep the original form in both states.

The old `variant` and `mapCountry` parameters no longer control the feature.
For a temporary Admin-only preview, use the standard `?labs=memberLocationMap`
session override; clear it with `?labs=` before testing the disabled state.

All members use one continuous Natural Earth world map. US members also see
state borders; the saved `region` selects the state, accepting names, postal
abbreviations, and `US-XX` codes. Countries and states share one Mercator SVG projection,
so Canada, Mexico and other surrounding countries remain visible. Alaska and
Hawaii keep their real positions, with horizontal wrapping at the date line.

Pins use verified interior points on the principal landmass, representing an
approximate country or state. Missing or unrecognized US states show a continental
US overview without a pin. Viewport fitting ignores distant islands/territories.
The map includes surrounding countries, sits 8px from the sidebar and right
edge, and shares the sidebar's top corner radius. Its fade starts 70% down.
The member avatar sits beside the main heading. The duplicate sidebar identity
and map location caption are removed; country and last-seen details remain in
the sidebar.

Members without a recognized country show no map or sample-map controls.

A standalone sample-data preview is available when the site's configured origin
cannot be reached. Run from the repository root:

```sh
pnpm --dir apps/admin exec vite --config vite.member-map-prototype.ts
```

Open [the sample preview](http://127.0.0.1:5188/member-map-preview.html).
It uses the same header component, with controls for UK, US, Singapore, unknown
location, and light/dark themes. US controls also cover South Carolina,
California, Alaska, Hawaii, Washington DC, and missing state data.
It makes no member API requests or writes. Its
form is a local sample, not the full member editor. The standalone server binds
only to loopback and does not require Docker.

## Findings

- The reference uses Leaflet with CARTO raster tiles and hardcoded city coordinates.
  During inspection its tiles displayed "API key required" watermarks.
- Ghost's geolocation service currently stores `country`, `country_code`, and
  `region`. It discards city and coordinates from its upstream lookup. Existing
  member records therefore cannot reliably support the reference's city marker.
- This spike uses local Natural Earth country and state paths generated with
  d3-geo. The generator dependency is development-only. No API key, geocoder,
  tile request, or backend change is needed. No member location is sent elsewhere.
- Unknown, missing, malformed, and unrecognized country data render a compact
  header without a map. The sidebar retains its unknown-location label.
- These are country/state outlines, not street maps. Atlas detail, geographic
  coverage, the roughly 1.5 MB uncompressed asset, and lazy loading need review
  before shipping.
- City or non-US region-level maps would be a separate follow-up: establish the desired
  precision, storage and historical-data strategy, then select a map provider.

## Validation and limits

The private Labs gate passed five browser acceptance cases covering enabled,
disabled, missing backend flag, unknown location, and new member states.
Core validation passed 19 Labs unit tests and 36 config/settings API tests.
The real Private features toggle was tested on and off and is left off by default.

The 35 focused map/header/formatting tests cover country codes (including Taiwan),
US state names and codes, Alaska, Hawaii, DC, missing states, member changes,
geometry reuse at the date line, disabled lazy loading, and failed map downloads.
The existing member detail formatting, navigation, and edit suites also passed
(82 tests). Admin TypeScript, focused lint, and a production React bundle build
passed. The bundle was built into a temporary directory with the Ember asset
publishing hook disabled to avoid replacing the running local Admin assets.

The preview was inspected at desktop and mobile widths, in light and dark themes,
with known and unknown locations. The integrated South Carolina member page and
Alaska, California, and Czech Republic previews were checked visually. Asset
generation verifies all 242 country and 51 state/DC anchors against their polygons.

Repository-wide `pnpm check` passed formatting and linting, but its test phase
reported failures outside the map feature, including Unsplash acceptance tests
and Core scheduling, automation, email, gift-preview, and request-queue tests.
This is not a green full-suite result.

The map is loaded only with the flag enabled. Its production chunk is about
510 kB compressed; geometry simplification, small-territory coverage, and boundary
policy remain follow-ups before a wider release.

## Map attribution

The current map uses public-domain Natural Earth data, which does not require
attribution. See the [asset documentation](map-data/README.md) for provenance,
generation, and limitations. The previous MapSVG and separate US datasets have
been replaced in this spike; the analytics map is unchanged.
