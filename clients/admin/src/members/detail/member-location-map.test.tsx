import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import MemberLocationMap from './member-location-map';
import atlas from './map-data/world-states.json';
import isoCountries from 'i18n-iso-countries';

beforeEach(() => {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(956);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(270);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const header = (countryCode: string, region?: unknown) => (
  <MemberLocationMap geolocation={JSON.stringify({ country_code: countryCode, region })}>
    <h1>Member</h1>
  </MemberLocationMap>
);

async function renderMap(countryCode: string, region?: unknown) {
  const result = render(header(countryCode, region));
  await act(async () => {
    await import('./map-data/world-states.json');
  });
  return result;
}

describe('member location map', () => {
  it('has unique country identifiers, including Singapore and Australia', () => {
    expect(new Set(atlas.countries.map((country) => country.id)).size).toBe(atlas.countries.length);
    expect(atlas.countries.find((country) => country.id === 'sg')?.name).toBe('Singapore');
    expect(atlas.countries.find((country) => country.id === 'au')?.name).toBe('Australia');
  });
  it('includes geometry for every ISO country and territory code', () => {
    const codes = new Set(atlas.countries.map((country) => country.id));
    expect(
      Object.keys(isoCountries.getAlpha2Codes()).filter((code) => !codes.has(code.toLowerCase())),
    ).toEqual([]);
  });

  it('keeps every anchor inside its rendered geometry, including tiny islands', () => {
    for (const location of [...atlas.countries, ...atlas.states]) {
      const [x, y] = location.anchor;
      let inside = false;
      for (const polygon of location.path.match(/M[^Z]+Z/g) ?? []) {
        const ring = polygon
          .slice(1, -1)
          .split('L')
          .map((point) => point.split(',').map(Number));
        for (let i = 0; i < ring.length; i += 1) {
          const [xi, yi] = ring[i];
          const [xj, yj] = ring[(i + ring.length - 1) % ring.length];
          const crossesY = yi > y !== yj > y;
          if (crossesY && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
          }
        }
      }
      expect(inside, location.id).toBe(true);
    }
  });

  it.each([
    ['BV', 'Bouvet Island', 3, -54],
    ['CX', 'Christmas Island', 106, -10],
    ['CC', 'Cocos (Keeling) Islands', 97, -12],
    ['GF', 'French Guiana', -53, 4],
    ['GI', 'Gibraltar', -5, 36],
    ['GP', 'Guadeloupe', -61, 16],
    ['MQ', 'Martinique', -61, 15],
    ['YT', 'Mayotte', 45, -13],
    ['RE', 'Reunion', 55, -21],
    ['SJ', 'Svalbard and Jan Mayen', 18, 78],
    ['TK', 'Tokelau', -172, -9],
    ['UM', 'United States Minor Outlying Islands', -162, 6],
    ['BQ', 'Bonaire, Sint Eustatius and Saba', -68, 12],
  ] as const)(
    'uses %s territory geometry and a local pin',
    async (code, name, longitude, latitude) => {
      await renderMap(code);
      expect(
        screen.getByRole('img', { name: `${name} — approximate country location` }),
      ).toBeTruthy();
      const country = atlas.countries.find((item) => item.id === code.toLowerCase())!;
      // Independently known territory coordinates catch aliases to a sovereign
      // country's mainland and misplaced anchors in generated data.
      const [x, y] = country.anchor;
      const anchorLongitude = x - 180;
      const anchorLatitude = (Math.atan(Math.sinh(((180 - y) * Math.PI) / 180)) * 180) / Math.PI;
      expect(Math.abs(anchorLongitude - longitude)).toBeLessThan(3);
      expect(Math.abs(anchorLatitude - latitude)).toBeLessThan(3);
    },
  );
  it('uses state boundaries and a South Carolina pin for the reported US member', async () => {
    await renderMap('US', 'South Carolina');
    expect(
      screen.getByRole('img', { name: 'South Carolina, US — approximate state location' }),
    ).toBeTruthy();
    const map = screen.getByTestId('member-location-map');
    expect(map.getAttribute('data-map-kind')).toBe('world');
    expect(map.querySelector('[data-location="us-sc"]')).toBeTruthy();
    expect(map.querySelector('[data-location="ca"]')).toBeTruthy();
    expect(map.querySelector('[data-location="mx"]')).toBeTruthy();
    // The reported bug showed a whole-world view. Fit a regional view instead.
    const [, , width, height] = map.getAttribute('viewBox')!.split(' ').map(Number);
    expect(width).toBeLessThan(90);
    expect(height).toBeLessThan(30);
  });

  it.each([' sc ', 'US-SC', 'south carolina'])(
    'recognizes state names and codes: %s',
    async (region) => {
      await renderMap('us', region);
      expect(
        screen.getByRole('img', { name: 'South Carolina, US — approximate state location' }),
      ).toBeTruthy();
    },
  );

  it.each([undefined, '', 'Atlantis', 42])(
    'shows a US overview without a fabricated state pin: %s',
    async (region) => {
      await renderMap('US', region);
      expect(screen.getByTestId('member-location-map').getAttribute('data-map-kind')).toBe('world');
      expect(screen.queryByRole('img')).toBeNull();
    },
  );

  it.each(['Alaska', 'Hawaii', 'District of Columbia'])('supports %s', async (region) => {
    await renderMap('US', region);
    expect(
      screen.getByRole('img', { name: `${region}, US — approximate state location` }),
    ).toBeTruthy();
  });

  it('updates the pin when navigating between US states', async () => {
    const { rerender } = await renderMap('US', 'South Carolina');
    rerender(header('US', 'California'));
    expect(screen.queryByRole('img', { name: /South Carolina/ })).toBeNull();
    expect(
      screen.getByRole('img', { name: 'California, US — approximate state location' }),
    ).toBeTruthy();
  });

  it('keeps the world map for non-US members, ignoring unrelated region values', async () => {
    await renderMap('GB', 'South Carolina');
    expect(screen.getByTestId('member-location-map').getAttribute('data-map-kind')).toBe('world');
    expect(
      screen.getByRole('img', { name: 'United Kingdom — approximate country location' }),
    ).toBeTruthy();
  });

  it('recognizes Taiwan by its ISO country code', async () => {
    await renderMap('TW');
    expect(screen.getByRole('img', { name: 'Taiwan — approximate country location' })).toBeTruthy();
    expect(
      screen.getByTestId('member-location-map-header').getAttribute('data-member-map-location'),
    ).toBe('known');
  });

  it('renders geometry once without date-line copies for South Carolina', async () => {
    await renderMap('US', 'SC');
    const map = screen.getByTestId('member-location-map');
    expect(map.querySelectorAll('path')).toHaveLength(atlas.countries.length + atlas.states.length);
    expect(map.querySelectorAll('use')).toHaveLength(0);
  });

  it('reuses the same geometry across the date line for Alaska', async () => {
    await renderMap('US', 'AK');
    const map = screen.getByTestId('member-location-map');
    const geometry = map.querySelector('g');
    expect(map.querySelectorAll('path')).toHaveLength(atlas.countries.length + atlas.states.length);
    const wrapped = map.querySelector('use');
    expect(wrapped?.getAttribute('href')).toBe(`#${geometry?.id}`);
    expect(wrapped?.getAttribute('transform')).toBe('translate(-360 0)');
  });

  it('does not show a map for an unknown country', async () => {
    await renderMap('XX', 'South Carolina');
    expect(screen.queryByTestId('member-location-map')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
