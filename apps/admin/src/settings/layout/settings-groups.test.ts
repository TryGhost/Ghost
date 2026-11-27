import { describe, expect, it } from 'vitest';
import { type RouteObject } from '@tryghost/admin-x-framework';
import { settingsRouteChildren } from '@/settings/routes';
import { settingsGroupItems } from '@/settings/hooks/use-settings-groups';
import { type SettingsSectionVisibility } from '@/settings/hooks/use-section-visibility';
import { SETTINGS_GROUPS, getSettingsGroup, settingsGroupForPath } from './settings-groups';

// Paths outside every group, which keep the group already showing
const UNGROUPED_ROUTES = new Set(['*', 'about']);

const routePaths = (routes: RouteObject[]): string[] =>
  routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...(route.children ? routePaths(route.children) : []),
  ]);

const visibility = (shown: boolean): SettingsSectionVisibility => ({
  isLoading: false,
  hasAutomations: shown,
  giftSubscriptions: shown,
  welcomeEmails: !shown,
  tipsAndDonations: shown,
  customFields: shown,
  offers: shown,
  emailKeywords: [],
});

describe('settingsGroupForPath', () => {
  it('resolves a group from its own path', () => {
    for (const group of SETTINGS_GROUPS) {
      expect(settingsGroupForPath(`/settings/${group.path}`)).toBe(group.id);
    }
  });

  it('resolves a section path, and its modal routes, to the section’s group', () => {
    expect(settingsGroupForPath('/settings/general')).toBe('general');
    expect(settingsGroupForPath('/settings/navigation/edit')).toBe('site');
    expect(settingsGroupForPath('/settings/staff/jamie/edit')).toBe('general');
    expect(settingsGroupForPath('/settings/embed-signup-form/show')).toBe('membership');
    expect(settingsGroupForPath('/settings/locksite')).toBe('membership');
    expect(settingsGroupForPath('/settings/stripe-connect')).toBe('payments');
    expect(settingsGroupForPath('/settings/tiers/checkout')).toBe('payments');
    expect(settingsGroupForPath('/settings/offers/edit/abc')).toBe('payments');
    expect(settingsGroupForPath('/settings/newsletters/new')).toBe('email');
    expect(settingsGroupForPath('/settings/emails')).toBe('email');
    expect(settingsGroupForPath('/settings/memberemails')).toBe('email');
    expect(settingsGroupForPath('/settings/metadata')).toBe('search-social');
    expect(settingsGroupForPath('/settings/explore/testimonial')).toBe('search-social');
    expect(settingsGroupForPath('/settings/integrations/zapier')).toBe('advanced');
    expect(settingsGroupForPath('/settings/history/view/1')).toBe('advanced');
  });

  it('leaves paths outside every group unresolved', () => {
    expect(settingsGroupForPath('/settings')).toBeUndefined();
    expect(settingsGroupForPath('/settings/')).toBeUndefined();
    expect(settingsGroupForPath('/settings/about')).toBeUndefined();
  });

  it('gives every path segment to one group only', () => {
    const segments = SETTINGS_GROUPS.flatMap((group) => [group.path, ...group.sections]);

    expect(new Set(segments).size).toBe(segments.length);
  });

  // A route left out would open its modal over whichever group was showing
  it('gives every Settings route a group', () => {
    const routes = routePaths(settingsRouteChildren).filter((path) => !UNGROUPED_ROUTES.has(path));

    expect(routes.length).toBeGreaterThan(0);
    expect(routes.filter((path) => !settingsGroupForPath(`/settings/${path}`))).toEqual([]);
  });
});

describe('settingsGroupItems', () => {
  // An item outside its group's sections would open another group when clicked
  it.each([true, false])(
    'puts every navigation item in its own group (optional sections shown: %s)',
    (shown) => {
      const items = settingsGroupItems(visibility(shown));

      for (const group of SETTINGS_GROUPS) {
        for (const item of items[group.id]) {
          const navids = Array.isArray(item.navid) ? item.navid : [item.navid];
          for (const navid of navids) {
            expect({ item: item.title, group: settingsGroupForPath(`/settings/${navid}`) }).toEqual(
              { item: item.title, group: group.id },
            );
          }
        }
      }
    },
  );

  it('lists each section in one navigation item only', () => {
    const navids = Object.values(settingsGroupItems(visibility(true)))
      .flat()
      .flatMap((item) => (Array.isArray(item.navid) ? item.navid : [item.navid]));

    expect(new Set(navids).size).toBe(navids.length);
  });

  it('only lists sections each group owns', () => {
    const items = settingsGroupItems(visibility(true));

    for (const group of SETTINGS_GROUPS) {
      const { sections } = getSettingsGroup(group.id);
      for (const item of items[group.id]) {
        const navids = Array.isArray(item.navid) ? item.navid : [item.navid];
        expect(navids.every((navid) => sections.includes(navid))).toBe(true);
      }
    }
  });
});
