import { describe, expect, it } from 'vitest';
import { billingSearchSource, getBillingSubRoute } from './billing-source';

const billingItem = (overrides: Record<string, unknown> = {}) => ({
  id: 'change-plan',
  title: 'Change plan',
  path: '/plans',
  keywords: 'billing subscription',
  ...overrides,
});

const ids = (search: unknown) => billingSearchSource(search).items.map((item) => item.id);

describe('billingSearchSource', () => {
  it('turns configured items into billing app routes', () => {
    expect(billingSearchSource({ groupName: 'Acme Hosting', items: [billingItem()] })).toEqual({
      id: 'billing',
      heading: 'Acme Hosting',
      isLoading: false,
      items: [
        {
          kind: 'navigate',
          id: 'change-plan',
          title: 'Change plan',
          keywords: 'billing subscription',
          to: '/pro/plans',
        },
      ],
    });
  });

  it('sends the billing app root to the billing route itself', () => {
    const [item] = billingSearchSource({
      groupName: 'Acme Hosting',
      items: [billingItem({ path: '/' })],
    }).items;

    expect(item).toMatchObject({ to: '/pro' });
  });

  it('trims the group name', () => {
    expect(
      billingSearchSource({ groupName: '  Acme Hosting  ', items: [billingItem()] }).heading,
    ).toBe('Acme Hosting');
  });

  it.each([
    ['no search config', undefined],
    ['a non-object search config', 'Acme Hosting'],
    ['a missing group name', { items: [billingItem()] }],
    ['a blank group name', { groupName: '   ', items: [billingItem()] }],
    ['a built-in group name', { groupName: 'Posts', items: [billingItem()] }],
    ['a padded built-in group name', { groupName: ' Posts ', items: [billingItem()] }],
    ['no items', { groupName: 'Acme Hosting', items: [] }],
    ['a non-array items value', { groupName: 'Acme Hosting', items: billingItem() }],
  ])('has no items for %s', (_description, search) => {
    expect(ids(search)).toEqual([]);
  });

  it.each([
    ['an absolute URL', { path: 'https://example.com' }],
    ['a relative path', { path: 'plans' }],
    ['a query string', { path: '/plans?intent=upgrade' }],
    ['a fragment', { path: '/plans#top' }],
    ['whitespace', { path: '/my plans' }],
    ['a trailing slash', { path: '/support/' }],
    ['a missing id', { id: '' }],
    ['a missing title', { title: undefined }],
  ])('drops configured items with %s', (_description, overrides) => {
    expect(
      ids({
        groupName: 'Acme Hosting',
        items: [billingItem({ id: 'valid', title: 'Valid' }), billingItem(overrides)],
      }),
    ).toEqual(['valid']);
  });

  it('skips configured items that are not objects', () => {
    expect(ids({ groupName: 'Acme Hosting', items: [null, 'plans', billingItem()] })).toEqual([
      'change-plan',
    ]);
  });

  it('strips unknown fields and defaults missing or non-string keywords to an empty string', () => {
    const { items } = billingSearchSource({
      groupName: 'Acme Hosting',
      items: [
        billingItem({ keywords: ['billing'], extra: 'ignored' }),
        billingItem({ id: 'no-keywords', keywords: undefined }),
      ],
    });

    expect(items).toEqual([
      { kind: 'navigate', id: 'change-plan', title: 'Change plan', to: '/pro/plans', keywords: '' },
      { kind: 'navigate', id: 'no-keywords', title: 'Change plan', to: '/pro/plans', keywords: '' },
    ]);
  });
});

describe('getBillingSubRoute', () => {
  it.each([
    ['/pro', '/'],
    ['/pro/plans', '/plans'],
    ['/pro/billing/history', '/billing/history'],
  ])('maps %s to the billing app route %s', (path, subRoute) => {
    expect(getBillingSubRoute(path)).toBe(subRoute);
  });

  it.each(['/tags/pro', '/profile', '/'])('has no billing app route for %s', (path) => {
    expect(getBillingSubRoute(path)).toBeUndefined();
  });
});
