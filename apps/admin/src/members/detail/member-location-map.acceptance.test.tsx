import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  configResponse,
  fakeAdminEndpoint,
  fakeMembers,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';

function fakeMemberLocation(geolocation: string | null) {
  const m = member({ name: 'Ada Lovelace', email: 'ada@example.com', geolocation });
  fakeMembers([m]);
  fakeAdminEndpoint('GET', new RegExp(`^/members/${m.id}/`), { members: [m] });
  fakeAdminEndpoint('GET', new RegExp('^/members/events/'), {
    events: [],
    meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
  });
  return m;
}

const location = JSON.stringify({
  country_code: 'US',
  country: 'United States',
  region: 'New Mexico',
});

describe('Member location maps Labs flag', () => {
  it.each(['disabled', 'missing'] as const)(
    'preserves the original header and sidebar when the flag is %s',
    async (state) => {
      const m = fakeMemberLocation(location);
      const config = configResponse();
      delete config.config.labs?.memberLocationMap;
      // Old spike query parameters must not bypass the Labs flag.
      await renderAdminApp(
        `/members/${m.id}?variant=A&mapCountry=GB`,
        state === 'disabled'
          ? { labs: { memberLocationMap: false } }
          : { boot: { browseConfig: { response: config } } },
      );

      await expect
        .element(page.getByRole('heading', { name: 'Ada Lovelace', level: 2 }))
        .toBeVisible();
      await expect.element(page.getByRole('link', { name: 'ada@example.com' })).toBeVisible();
      await expect
        .element(page.getByTestId('member-detail-title'))
        .toHaveTextContent('Ada Lovelace');
      await expect(page.getByTestId('member-location-map-header')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Ada Lovelace', level: 1 })).toHaveCount(0);
    },
  );

  it('enables the map and the complete profile-header layout together', async () => {
    const m = fakeMemberLocation(location);
    await renderAdminApp(`/members/${m.id}`, { labs: { memberLocationMap: true } });

    await expect
      .element(page.getByRole('img', { name: 'New Mexico, US — approximate state location' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('heading', { name: 'Ada Lovelace', level: 1 }))
      .toBeVisible();
    await expect.element(page.getByTestId('member-detail-title')).toHaveTextContent('Ada Lovelace');
    await expect(page.getByRole('heading', { name: 'Ada Lovelace', level: 2 })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'ada@example.com' })).toHaveCount(0);
  });

  it('keeps the enabled profile header without a map for unknown locations', async () => {
    const m = fakeMemberLocation(null);
    await renderAdminApp(`/members/${m.id}`, { labs: { memberLocationMap: true } });

    await expect
      .element(page.getByRole('heading', { name: 'Ada Lovelace', level: 1 }))
      .toBeVisible();
    await expect
      .element(page.getByTestId('member-location-map-header'))
      .toHaveAttribute('data-member-map-location', 'unknown');
    await expect(page.getByTestId('member-location-map')).toHaveCount(0);
  });

  it('keeps the new-member form unchanged when enabled', async () => {
    fakeMembers([]);
    await renderAdminApp('/members/new', { labs: { memberLocationMap: true } });
    await expect.element(page.getByTestId('member-detail-title')).toHaveTextContent('New member');
    await expect.element(page.getByLabelText('Name')).toBeVisible();
    await expect(page.getByTestId('member-location-map-header')).toHaveCount(0);
  });
});
