import { describe, expect, it } from 'vitest';

import { currentUserResponse, renderAdminApp, settingsResponse } from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';

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
    expect(rootProperty('--adjusted-accent-color')).toBe('#123456');
  });

  it('keeps the adjusted accent readable against the current theme', async () => {
    await renderAdminApp('/site', {
      boot: {
        browseSettings: { response: settingsResponse({ settings: { accent_color: '#ffffff' } }) },
      },
    });

    await expect.poll(() => rootProperty('--adjusted-accent-color')).toBe('#B3B3B3');
    expect(rootProperty('--accent-color')).toBe('#ffffff');

    await sidebarScreen.selectAppearance('dark');
    await expect.poll(() => rootProperty('--adjusted-accent-color')).toBe('#FFFFFF');
  });

  it('adjusts the accent for a saved dark appearance on load', async () => {
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({ nightShift: 'dark' });

    await renderAdminApp('/site', {
      boot: {
        browseMe: { response: me },
        browseSettings: { response: settingsResponse({ settings: { accent_color: '#000000' } }) },
      },
    });

    await expect.poll(() => rootProperty('--adjusted-accent-color')).toBe('#4D4D4D');
  });
});
