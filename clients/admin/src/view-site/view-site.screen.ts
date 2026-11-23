import { page } from 'vitest/browser';
import { sitePreviewFrame, viewSiteNavLink } from '@tryghost/test-data/selectors/view-site';
import { sidebarScreen } from '@/layout/sidebar.screen';

export const viewSiteScreen = {
  frame: () => page.getByTitle(sitePreviewFrame, { exact: true }),
  navLink: () => sidebarScreen.navLink(viewSiteNavLink),
};
