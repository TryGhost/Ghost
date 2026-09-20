# Continuous world and US state map

`world-states.json` is generated from the 50m country and state/province layers
in [Natural Earth 5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2).
It contains world countries and all 50 US states plus Washington, DC.
Country ISO codes and US subdivision codes come from the source attributes.
Features without a country code keep a separate Natural Earth identifier.

Regenerate from the repository root:

```sh
pnpm --dir apps/admin exec node src/members/detail/map-data/generate-map.mjs
pnpm format apps/admin/src/members/detail/map-data/world-states.json
```

The generator uses d3-geo to project both layers into one Mercator SVG
coordinate system. Alaska and Hawaii stay at their real geographic locations.
Source URLs and SHA-256 hashes are recorded in the asset. The app renders local
paths; d3-geo is only a development dependency for asset generation.

Viewport bounds use the largest landmass to avoid fitting distant territories.
Pin positions are interior points, verified against every source polygon, and
represent approximate country/state locations, never member coordinates.
The renderer uses SVG references to reuse geometry only when the view crosses
the date line. Path coordinates are rounded to two decimals (subpixel precision
at the minimum header zoom).

The asset is roughly 1.5 MB before compression (about 0.5 MB compressed). Further simplification,
small-territory coverage and disputed-boundary policy need review before shipping.

## Licence

Natural Earth map data is public domain. Attribution is not required.
See [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/).
This replaces both the MapSVG world data and the separate Census/Albers US
asset in this spike. The analytics map still uses its existing dataset.
