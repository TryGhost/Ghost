import { describe, expect, it } from 'vitest';

import { allowUnhandledRequests, currentRoute, renderAdminApp } from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';

import { globalShortcutsScreen } from './global-shortcuts.screen';

describe('App-wide shortcuts', () => {
  it('opens settings from Cmd/Ctrl+, on a screen with the sidebar', async () => {
    // The settings app owns its request graph; this spec asserts only the navigation.
    allowUnhandledRequests();
    await renderAdminApp('/site');
    await expect.element(sidebarScreen.shellNav()).toBeVisible();

    await expect.poll(() => globalShortcutsScreen.press('openSettings')).toBe(true);

    await expect.poll(currentRoute).toMatch(/^\/settings/);
    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
  });

  it('returns to the opening route after Settings is opened with the shortcut', async () => {
    allowUnhandledRequests();
    await renderAdminApp('/site', { labs: { admin7settings: true } });

    await expect.poll(() => globalShortcutsScreen.press('openSettings')).toBe(true);
    await expect.poll(currentRoute).toBe('/settings');

    await sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' }).click();
    await expect.poll(currentRoute).toBe('/site');
  });

  it('stays put on Cmd/Ctrl+, while the screen hides the sidebar', async () => {
    // The settings app owns its request graph; this spec asserts only the navigation.
    allowUnhandledRequests();
    await renderAdminApp('/settings/staff');
    await expect.element(sidebarScreen.shellMain()).toBeInTheDocument();

    await expect.poll(() => globalShortcutsScreen.press('openSettings')).toBe(true);

    expect(currentRoute()).toBe('/settings/staff');
  });

  it('keeps Cmd/Ctrl+S from opening the browser save dialog', async () => {
    await renderAdminApp('/site');
    await expect.element(sidebarScreen.shellNav()).toBeVisible();

    await expect.poll(() => globalShortcutsScreen.press('save')).toBe(true);

    expect(currentRoute()).toBe('/site');
  });

  it('leaves the shortcuts to Ember on the screens Ember shows', async () => {
    await renderAdminApp('/pro');
    await expect.element(sidebarScreen.shellNav()).toBeVisible();

    expect(globalShortcutsScreen.press('save'), 'save handled').toBe(false);
    expect(globalShortcutsScreen.press('openSettings'), 'settings handled').toBe(false);
    expect(currentRoute()).toBe('/pro');
  });
});
