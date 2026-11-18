import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  allowUnhandledRequests,
  currentRoute,
  fakeAdminStats,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';
import { adminFrameScreen } from './admin-frame.screen';
import { sidebarScreen } from './sidebar.screen';

const HELP_URL = 'https://ghost.org/help?utm_source=admin&utm_campaign=help';
const topBarHelp = () => adminFrameScreen.topBar().getByRole('link', { name: 'Help', exact: true });

/** Opens Help clicks in the side panel, as a host script that provides in-app support does. */
function openHelpInSidePanel(content: HTMLElement): () => void {
  const openHelp = (event: MouseEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-ghost-help]') &&
      window.ghost?.sidePanel.open(content)
    ) {
      event.preventDefault();
    }
  };
  document.addEventListener('click', openHelp, true);
  return () => document.removeEventListener('click', openHelp, true);
}

/** Cancels Help clicks, as a host script that handles them itself does. */
function takeOverHelpClicks(): () => void {
  const takeOver = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('[data-ghost-help]')) {
      event.preventDefault();
    }
  };
  document.addEventListener('click', takeOver, true);
  return () => document.removeEventListener('click', takeOver, true);
}

/**
 * The Admin 7 frame's top bar shows the site's numbers. Mobile specs need them
 * too: the viewport is back at desktop width before the app unmounts.
 */
function fakeAdmin7Chrome(): void {
  fakeTags([]);
  fakeAdminStats.memberCount();
  fakeAdminStats.mrr();
}

/** Opens Settings from Tags, which swaps the main navigation for the Settings one. */
async function openSettings(labs: { inAppSupport: boolean }): Promise<void> {
  // The settings app owns its request graph; these specs assert only the navigation.
  allowUnhandledRequests();
  fakeTags([]);
  await renderAdminApp('/tags', { labs });
  await sidebarScreen.navLink('Settings').click();
  await expect.poll(currentRoute).toMatch(/^\/settings/);
  await expect
    .element(sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' }))
    .toBeVisible();
}

describe('In-app support Help links', () => {
  let stopOpeningHelp = () => {};

  afterEach(async () => {
    stopOpeningHelp();
    await page.viewport(1280, 800);
  });

  it.each([true, false])(
    'marks the sidebar Help link for host scripts: inAppSupport %s',
    async (inAppSupport) => {
      await renderAdminApp('/site', { labs: { inAppSupport } });

      const help = sidebarScreen.navLink('Help');
      await expect.element(help).toBeVisible();
      if (inAppSupport) {
        await expect.element(help).toHaveAttribute('data-ghost-help');
      } else {
        await expect.element(help).not.toHaveAttribute('data-ghost-help');
      }
    },
  );

  it('shows Help in the Admin 7 top bar, marked for host scripts, in place of the user menu item', async () => {
    fakeAdmin7Chrome();
    await renderAdminApp('/tags', { labs: { admin7Design: true, inAppSupport: true } });

    const help = topBarHelp();
    await expect.element(help).toBeVisible();
    await expect.element(help).toHaveAttribute('data-ghost-help');
    await expect.element(help).toHaveAttribute('href', HELP_URL);
    await expect.element(help).toHaveAttribute('target', '_blank');
    await expect.element(help).toHaveAttribute('rel', 'noopener noreferrer');
    await expect.element(help).toHaveAttribute('title', 'Help');

    await sidebarScreen.userMenuTrigger().click();
    await expect.element(sidebarScreen.profileMenuItem()).toBeVisible();
    await expect.element(sidebarScreen.helpMenuItem()).not.toBeInTheDocument();
  });

  it('keeps Help in the Admin 7 user menu, unmarked, without inAppSupport', async () => {
    fakeAdmin7Chrome();
    await renderAdminApp('/tags', { labs: { admin7Design: true, inAppSupport: false } });
    await expect.element(adminFrameScreen.topBar()).toBeVisible();

    await expect.element(topBarHelp()).not.toBeInTheDocument();
    await sidebarScreen.userMenuTrigger().click();
    const help = sidebarScreen.helpMenuItem();
    await expect.element(help).toBeVisible();
    await expect.element(help).not.toHaveAttribute('data-ghost-help');
  });

  it('keeps Help, marked, in the Admin 7 user menu on mobile, where there is no top bar', async () => {
    await page.viewport(390, 844);
    fakeAdmin7Chrome();
    await renderAdminApp('/tags', { labs: { admin7Design: true, inAppSupport: true } });

    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    await sidebarScreen.userMenuTrigger().click();
    const help = sidebarScreen.helpMenuItem();
    await expect.element(help).toBeVisible();
    await expect.element(help).toHaveAttribute('data-ghost-help');
    await expect.element(adminFrameScreen.topBar()).not.toBeInTheDocument();
  });

  it.each([
    { gesture: 'click', select: () => sidebarScreen.helpMenuItem().click() },
    {
      gesture: 'Enter',
      select: async () => {
        sidebarScreen.helpMenuItem().element().focus();
        await userEvent.keyboard('{Enter}');
      },
    },
  ])(
    'closes the Admin 7 user menu when a host script takes over its Help click: $gesture',
    async ({ select }) => {
      await page.viewport(390, 844);
      fakeAdmin7Chrome();
      stopOpeningHelp = takeOverHelpClicks();
      await renderAdminApp('/tags', { labs: { admin7Design: true, inAppSupport: true } });

      await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
      await sidebarScreen.userMenuTrigger().click();
      await expect.element(sidebarScreen.helpMenuItem()).toBeVisible();
      await select();

      await expect.element(sidebarScreen.helpMenuItem()).not.toBeInTheDocument();
    },
  );

  it('opens Help in the side panel from the Admin 7 top bar in Settings', async () => {
    // The settings app owns its request graph; this spec asserts only the panel.
    allowUnhandledRequests();
    fakeAdmin7Chrome();
    const content = document.createElement('iframe');
    content.title = 'Help content';
    stopOpeningHelp = openHelpInSidePanel(content);
    await renderAdminApp('/tags', { labs: { admin7Design: true, inAppSupport: true } });
    await expect.element(topBarHelp()).toBeVisible();

    window.location.hash = '#/settings';
    await expect.poll(currentRoute).toMatch(/^\/settings/);
    await expect
      .element(sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' }))
      .toBeVisible();
    await topBarHelp().click();

    await expect
      .poll(() => document.querySelector('[data-side-panel]')?.contains(content))
      .toBe(true);
  });

  it('adds Help under the Settings navigation, marked for host scripts', async () => {
    await openSettings({ inAppSupport: true });

    const help = sidebarScreen.navLink('Help');
    await expect.element(help).toBeVisible();
    await expect.element(help).toHaveAttribute('data-ghost-help');
    await expect
      .element(help)
      .toHaveAttribute('href', 'https://ghost.org/help?utm_source=admin&utm_campaign=help');
    await expect.element(help).toHaveAttribute('target', '_blank');
  });

  it('leaves Help out of the Settings navigation without inAppSupport', async () => {
    await openSettings({ inAppSupport: false });

    await expect.element(sidebarScreen.navLink('Help')).not.toBeInTheDocument();
  });

  it('opens Help in the side panel from Settings', async () => {
    const content = document.createElement('iframe');
    content.title = 'Help content';
    stopOpeningHelp = openHelpInSidePanel(content);
    await openSettings({ inAppSupport: true });

    await sidebarScreen.navLink('Help').click();

    await expect
      .poll(() => document.querySelector('[data-side-panel]')?.getAttribute('data-side-panel'))
      .toBe('default');
    expect(document.querySelector('[data-side-panel]')?.contains(content)).toBe(true);
  });

  describe('returning focus as Help closes', () => {
    let content: HTMLIFrameElement;
    const helpLink = () => sidebarScreen.navLink('Help');
    const backToApp = () => sidebarScreen.shellNav().getByRole('button', { name: 'Back to app' });

    /** Opens Help from the link on screen and moves focus into it, as reading Help would. */
    async function openHelpFromLink(): Promise<HTMLElement> {
      await expect.element(helpLink()).toBeVisible();
      const opener = helpLink().element() as HTMLElement;
      opener.focus();
      await helpLink().click();
      await expect
        .poll(() => document.querySelector('[data-side-panel]')?.contains(content))
        .toBe(true);
      content.focus();
      expect(document.activeElement).toBe(content);
      return opener;
    }

    beforeEach(() => {
      content = document.createElement('iframe');
      content.title = 'Help content';
      stopOpeningHelp = openHelpInSidePanel(content);
    });

    it('goes to the Settings Help link when Help opened from the main navigation closes in Settings', async () => {
      // The settings app owns its request graph; this spec asserts only the navigation.
      allowUnhandledRequests();
      fakeTags([]);
      await renderAdminApp('/tags', { labs: { inAppSupport: true } });
      const opener = await openHelpFromLink();

      window.location.hash = '#/settings';
      await expect.poll(currentRoute).toMatch(/^\/settings/);
      await expect.element(backToApp()).toBeVisible();
      expect(opener.isConnected).toBe(false);
      // Back in Help to close it, past Settings focusing its search as it loads
      await expect.element(page.getByPlaceholder('Search settings')).toHaveFocus();
      content.focus();
      window.ghost?.sidePanel.close();

      await expect.poll(() => document.activeElement).toBe(helpLink().element());
    });

    it('goes to the main navigation Help link when Help opened in Settings closes on a main screen', async () => {
      await openSettings({ inAppSupport: true });
      const opener = await openHelpFromLink();

      window.history.back();
      await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
      expect(opener.isConnected).toBe(false);
      content.focus();
      window.ghost?.sidePanel.close();

      await expect.poll(() => document.activeElement).toBe(helpLink().element());
    });

    it('goes back to the link Help opened from while it is still on screen', async () => {
      await openSettings({ inAppSupport: true });
      const opener = await openHelpFromLink();

      window.ghost?.sidePanel.close();

      await expect.poll(() => document.activeElement).toBe(opener);
    });
  });
});
