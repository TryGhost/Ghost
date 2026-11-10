import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { fakeAdminStats, fakeTags, renderAdminApp } from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

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

/** The Admin 7 frame's top bar shows the site's numbers. */
function fakeAdmin7Chrome(): void {
  fakeTags([]);
  fakeAdminStats.memberCount();
  fakeAdminStats.mrr();
}

describe('In-app support Help links', () => {
  let stopOpeningHelp = () => {};

  afterEach(() => {
    stopOpeningHelp();
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

  it.each([true, false])(
    'marks the Admin 7 user menu Help item for host scripts: inAppSupport %s',
    async (inAppSupport) => {
      fakeAdmin7Chrome();
      await renderAdminApp('/tags', { labs: { admin7Design: true, inAppSupport } });

      await sidebarScreen.userMenuTrigger().click();
      const help = sidebarScreen.helpMenuItem();
      await expect.element(help).toBeVisible();
      if (inAppSupport) {
        await expect.element(help).toHaveAttribute('data-ghost-help');
      } else {
        await expect.element(help).not.toHaveAttribute('data-ghost-help');
      }
    },
  );

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
    'closes the Admin 7 user menu when a host script opens Help in the side panel: $gesture',
    async ({ select }) => {
      fakeAdmin7Chrome();
      const content = document.createElement('iframe');
      content.title = 'Help content';
      stopOpeningHelp = openHelpInSidePanel(content);
      await renderAdminApp('/tags', { labs: { admin7Design: true, inAppSupport: true } });

      await sidebarScreen.userMenuTrigger().click();
      await expect.element(sidebarScreen.helpMenuItem()).toBeVisible();
      await select();

      await expect.element(sidebarScreen.helpMenuItem()).not.toBeInTheDocument();
      await expect
        .poll(() => document.querySelector('[data-side-panel]')?.contains(content))
        .toBe(true);
    },
  );
});
