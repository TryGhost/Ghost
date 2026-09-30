// Regenerate from the repository root:
// pnpm --dir apps/admin exec node src/members/detail/map-data/generate-map.mjs
// pnpm format apps/admin/src/members/detail/map-data/world-states.json
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { geoArea, geoContains, geoMercator, geoPath } from 'd3-geo';

const base = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';
const projection = geoMercator()
  .scale(180 / Math.PI)
  .translate([180, 180]);
// A hundredth of a projected degree is below a pixel at the header's minimum
// 18-degree view height, including high-density displays.
const path = geoPath(projection).digits(2);
const sources = [];

async function read(name) {
  const url = `${base}${name}.geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const raw = await response.text();
  sources.push({ url, sha256: createHash('sha256').update(raw).digest('hex') });
  return JSON.parse(raw).features;
}

function distanceSquared([x, y], [ax, ay], [bx, by]) {
  const dx = bx - ax,
    dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
  return (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
}

function location(feature, id, name) {
  // Natural Earth GeoJSON uses RFC winding; D3 expects clockwise exteriors.
  const coordinates =
    feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  const polygons = coordinates.map((rings) => {
    const polygon = { type: 'Polygon', coordinates: rings };
    if (geoArea(polygon) > 2 * Math.PI)
      polygon.coordinates = rings.map((ring) => [...ring].reverse());
    return polygon;
  });
  const geometry = {
    type: 'MultiPolygon',
    coordinates: polygons.map((polygon) => polygon.coordinates),
  };
  // Fit the principal landmass, not distant islands/territories. In particular,
  // the continental US determines the country overview, rather than Alaska.
  const main = polygons.reduce((a, b) => (geoArea(a) > geoArea(b) ? a : b));
  const [[x0, y0], [x1, y1]] = path.bounds(main);
  // Mercator clips the poles; keep edge-distance calculations finite there too.
  const rings = main.coordinates.map((ring) =>
    ring.map(([longitude, latitude]) =>
      projection([longitude, Math.max(-85.05112878, Math.min(85.05112878, latitude))]),
    ),
  );
  const edges = rings.flatMap((ring) => ring.slice(1).map((point, i) => [ring[i], point]));
  let anchor,
    best = -1;
  for (let i = 0; i < 40; i++) {
    for (let j = 0; j < 40; j++) {
      const point = [x0 + ((i + 0.5) * (x1 - x0)) / 40, y0 + ((j + 0.5) * (y1 - y0)) / 40];
      if (!geoContains(main, projection.invert(point))) continue;
      const distance = Math.min(...edges.map(([a, b]) => distanceSquared(point, a, b)));
      if (distance > best) {
        best = distance;
        anchor = point;
      }
    }
  }
  if (!anchor || !geoContains(geometry, projection.invert(anchor)))
    throw new Error(`No interior anchor: ${id}`);
  return { id, name, path: path(geometry), bounds: [x0, y0, x1 - x0, y1 - y0], anchor };
}

const countries = (await read('ne_50m_admin_0_countries')).map((feature) => {
  const p = feature.properties;
  const code = [
    p.ISO_A2,
    ...(['NOR', 'FRA', 'KOS', 'TWN'].includes(p.ADM0_A3) ? [p.ISO_A2_EH] : []),
  ].find((value) => /^[A-Z]{2}$/.test(value));
  return location(feature, code?.toLowerCase() ?? `ne-${p.NE_ID}`, p.NAME_EN || p.ADMIN);
});
if (new Set(countries.map((country) => country.id)).size !== countries.length) {
  throw new Error('Country identifiers must be unique');
}
const states = (await read('ne_50m_admin_1_states_provinces'))
  .filter((feature) => feature.properties.iso_a2 === 'US')
  .map((feature) =>
    location(feature, feature.properties.iso_3166_2.toLowerCase(), feature.properties.name),
  );
if (states.length !== 51) throw new Error('Expected all 50 US states and DC');
await writeFile(
  new URL('./world-states.json', import.meta.url),
  JSON.stringify({ sources, countries, states }, null, 2) + '\n',
);
console.log(
  `Generated ${countries.length} countries and ${states.length} states; every pin verified inside its geometry.`,
);
