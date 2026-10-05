import { describe, expect, it } from 'vitest';
import { buildAutocompleteLinks, buildOfferLinks } from './autocomplete-links';

describe('buildAutocompleteLinks', () => {
  const settings = {
    postType: 'post' as const,
    homepageUrl: 'https://example.com/',
    paidMembersEnabled: true,
    donationsEnabled: true,
    recommendationsEnabled: true,
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

  it('resolves offer codes against a subdirectory homepage', () => {
    expect(buildOfferLinks([{ name: 'Sale', code: '/sale' }], 'https://example.com/blog/')).toEqual(
      [{ label: 'Offer — Sale', value: 'https://example.com/blog/sale' }],
    );
  });
});
