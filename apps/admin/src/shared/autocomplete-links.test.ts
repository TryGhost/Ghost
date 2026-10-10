import { describe, expect, it } from 'vitest';
import { buildAutocompleteLinks, buildOfferLinks } from './autocomplete-links';

describe('buildAutocompleteLinks', () => {
  const settings = {
    postType: 'post' as const,
    homepageUrl: 'https://example.com/',
    paidMembersEnabled: true,
    donationsEnabled: true,
    recommendationsEnabled: true,
    membersSignupAccess: 'all',
  };

  it('lists every portal link in display order', () => {
    const offerLinks = buildOfferLinks(
      [{ name: 'Spring sale', code: 'spring' }],
      settings.homepageUrl,
    );

    expect(buildAutocompleteLinks(settings, offerLinks)).toEqual([
      { label: 'Homepage', value: 'https://example.com/' },
      { label: 'Free signup', value: '#/portal/signup/free' },
      { label: 'Paid signup', value: '#/portal/signup' },
      { label: 'Upgrade or change plan', value: '#/portal/account/plans' },
      { label: 'Tips and donations', value: '#/portal/support' },
      { label: 'Gift subscriptions', value: '#/portal/gift' },
      { label: 'Share post', value: '#/share' },
      { label: 'Recommendations', value: '#/portal/recommendations' },
      { label: 'Offer — Spring sale', value: 'https://example.com/spring' },
    ]);
  });

  it('drops paid, donation and recommendation links when those features are off', () => {
    const links = buildAutocompleteLinks(
      {
        ...settings,
        postType: 'page',
        paidMembersEnabled: false,
        donationsEnabled: false,
        recommendationsEnabled: false,
      },
      [],
    );

    expect(links).toEqual([
      { label: 'Homepage', value: 'https://example.com/' },
      { label: 'Free signup', value: '#/portal/signup/free' },
      { label: 'Share page', value: '#/share' },
    ]);
  });

  it('offers no share link outside a post or page', () => {
    const links = buildAutocompleteLinks({ ...settings, postType: undefined }, []);

    expect(links.map((link) => link.value)).not.toContain('#/share');
  });

  it('hides free signup when members signup access is not all', () => {
    const links = buildAutocompleteLinks({ ...settings, membersSignupAccess: 'paid' }, []);

    expect(links.map((link) => link.label)).not.toContain('Free signup');
    expect(links.map((link) => link.label)).toContain('Paid signup');
  });

  it('hides both signup links when members signup is invite-only', () => {
    const labels = buildAutocompleteLinks({ ...settings, membersSignupAccess: 'invite' }, []).map(
      (link) => link.label,
    );

    expect(labels).not.toContain('Free signup');
    expect(labels).not.toContain('Paid signup');
    expect(labels).toContain('Gift subscriptions');
  });

  it('hides both signup links when members are off', () => {
    const labels = buildAutocompleteLinks({ ...settings, membersSignupAccess: 'none' }, []).map(
      (link) => link.label,
    );

    expect(labels).not.toContain('Free signup');
    expect(labels).not.toContain('Paid signup');
  });

  it('resolves offer codes against a subdirectory homepage', () => {
    expect(buildOfferLinks([{ name: 'Sale', code: '/sale' }], 'https://example.com/blog/')).toEqual(
      [{ label: 'Offer — Sale', value: 'https://example.com/blog/sale' }],
    );
  });
});
