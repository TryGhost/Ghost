import type { User } from '@tryghost/admin-x-framework/api/users';
import { describe, expect, it } from 'vitest';
import type { SettingsSectionVisibility } from '@/settings/hooks/use-section-visibility';
import { getSettingsSections, settingsSearchItems } from './search-source';

const visibility = (overrides: Partial<SettingsSectionVisibility> = {}) => ({
  isLoading: false,
  hasAutomations: false,
  giftSubscriptions: false,
  welcomeEmails: true,
  tipsAndDonations: false,
  customFields: false,
  offers: false,
  emailKeywords: ['emails'],
  ...overrides,
});

const allVisible = visibility({
  giftSubscriptions: true,
  tipsAndDonations: true,
  customFields: true,
  offers: true,
});

const user = (role: string) => ({ roles: [{ name: role }] }) as unknown as User;
const navids = (sections: Array<{ navid: string }>) => sections.map(({ navid }) => navid);
const itemIds = (items: Array<{ id: string }>) => items.map(({ id }) => id);

describe('getSettingsSections', () => {
  it('lists every sidebar section once', () => {
    const ids = navids(getSettingsSections(allVisible));

    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
  });

  it.each([
    ['gift-subscriptions', 'giftSubscriptions'],
    ['memberemails', 'welcomeEmails'],
    ['tips-and-donations', 'tipsAndDonations'],
    ['custom-fields', 'customFields'],
    ['offers', 'offers'],
  ] as const)('only lists %s while %s', (navid, flag) => {
    expect(navids(getSettingsSections(visibility({ [flag]: true })))).toContain(navid);
    expect(navids(getSettingsSections(visibility({ [flag]: false })))).not.toContain(navid);
  });

  it('names the email section after the automations flag', () => {
    const email = (hasAutomations: boolean) =>
      getSettingsSections(visibility({ hasAutomations })).find(
        ({ navid }) => navid === 'enable-newsletters',
      );

    expect(email(false)).toMatchObject({ title: 'Newsletters', keywords: ['emails'] });
    expect(email(true)).toMatchObject({ title: 'Email' });
  });
});

describe('settingsSearchItems', () => {
  it.each(['Owner', 'Administrator'])('gives an %s every section', (role) => {
    expect(itemIds(settingsSearchItems(user(role), allVisible))).toEqual(
      navids(getSettingsSections(allVisible)),
    );
  });

  it.each(['Editor', 'Super Editor'])('gives an %s only Staff', (role) => {
    expect(itemIds(settingsSearchItems(user(role), allVisible))).toEqual(['staff']);
  });

  it.each(['Author', 'Contributor'])('gives an %s nothing', (role) => {
    expect(settingsSearchItems(user(role), allVisible)).toEqual([]);
  });

  it('gives nothing before the user loads', () => {
    expect(settingsSearchItems(undefined, allVisible)).toEqual([]);
  });

  it('links each section and matches its keywords', () => {
    const [timezone] = settingsSearchItems(user('Owner'), allVisible).filter(
      ({ id }) => id === 'timezone',
    );

    expect(timezone).toEqual({
      kind: 'navigate',
      id: 'timezone',
      title: 'Timezone',
      keywords: 'general time date site timezone time zone',
      to: '/settings/timezone',
    });
  });
});
