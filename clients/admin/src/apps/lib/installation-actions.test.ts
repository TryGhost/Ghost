import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { describe, expect, it } from 'vitest';
import { type AppsAvailability, installationActions } from './installation-actions';

const installation = (status: AppInstallation['status']) => ({
  id: 'installation-1',
  status,
  manifest_url: 'https://podcast.example.com/ghost-app.json',
});

const REVIEW = `/apps/install?manifest=${encodeURIComponent('https://podcast.example.com/ghost-app.json')}`;
const loaded = { isLoaded: true };
const nothing = {
  canOpen: false,
  canReview: false,
  canPin: false,
  rowTo: '/apps/details/installation-1',
  shortcutTo: null,
};

describe('installationActions', () => {
  it('opens and pins an active app, and leads to its page from everywhere', () => {
    expect(installationActions(installation('active'), 'supported', loaded)).toEqual({
      canOpen: true,
      canReview: false,
      canPin: true,
      rowTo: '/apps/installation-1',
      shortcutTo: '/apps/installation-1',
    });
  });

  it('offers a review of a suspended app, which a shortcut to it opens', () => {
    expect(installationActions(installation('suspended'), 'supported', loaded)).toEqual({
      canOpen: false,
      canReview: true,
      canPin: true,
      // The row still leads to the app, which says it's waiting for approval
      rowTo: '/apps/installation-1',
      shortcutTo: REVIEW,
    });
  });

  it('offers no pinning until the pins have loaded', () => {
    for (const pins of [undefined, { isLoaded: false }]) {
      expect(installationActions(installation('active'), 'supported', pins)).toMatchObject({
        canOpen: true,
        canPin: false,
      });
    }
  });

  it.each(['unsupported', 'loading'] as AppsAvailability[])(
    'offers nothing that opens an app while apps are %s, and leads to its details',
    (availability) => {
      for (const status of ['active', 'suspended'] as const) {
        expect(installationActions(installation(status), availability, loaded)).toEqual(nothing);
      }
    },
  );

  it('offers nothing for an uninstalled app but its details', () => {
    expect(installationActions(installation('uninstalled'), 'supported', loaded)).toEqual(nothing);
  });
});
