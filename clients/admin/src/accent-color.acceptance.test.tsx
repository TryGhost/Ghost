import { describe, expect, it } from 'vitest';

import { renderAdminApp, settingsResponse } from '@test-utils/acceptance';

const rootProperty = (name: string) => document.documentElement.style.getPropertyValue(name);

describe('Accent color', () => {
  it('publishes the site accent color as root CSS variables', async () => {
    await renderAdminApp('/site', {
      boot: {
        browseSettings: { response: settingsResponse({ settings: { accent_color: '#123456' } }) },
      },
    });

    await expect.poll(() => rootProperty('--accent-color')).toBe('#123456');
    expect(rootProperty('--kg-accent-color')).toBe('#123456');
  });
});
