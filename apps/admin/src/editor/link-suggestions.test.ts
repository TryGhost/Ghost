import { describe, expect, it } from 'vitest';
import {
  buildAutocompleteLinks,
  buildLatestPostsGroup,
  buildOfferLinks,
  decoratePostSearchResult,
  filterLinkSearchResults,
  formatPublishedDate,
  searchIndexEntitiesGroup,
  searchIndexPostsGroup,
} from './link-suggestions';

const decoration = { timezone: 'Etc/UTC', membersEnabled: true };

describe('buildAutocompleteLinks', () => {
  const settings = {
    postType: 'post' as const,
    homepageUrl: 'https://example.com/',
    paidMembersEnabled: true,
    donationsEnabled: true,
    recommendationsEnabled: true,
  };

  it('lists every portal link in the Ember order', () => {
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

  it('resolves offer codes against a subdirectory homepage', () => {
    expect(buildOfferLinks([{ name: 'Sale', code: '/sale' }], 'https://example.com/blog/')).toEqual(
      [{ label: 'Offer — Sale', value: 'https://example.com/blog/sale' }],
    );
  });
});

describe('formatPublishedDate', () => {
  it('formats in the site timezone as day, short month, year', () => {
    expect(formatPublishedDate('2026-03-01T23:30:00.000Z', 'Etc/UTC')).toBe('1 Mar 2026');
    expect(formatPublishedDate('2026-03-01T23:30:00.000Z', 'Pacific/Auckland')).toBe('2 Mar 2026');
  });
});

describe('decoratePostSearchResult', () => {
  it('adds the published date and a members-only marker', () => {
    const item = decoratePostSearchResult(
      {
        id: 'post.1',
        title: 'Hello',
        url: '/hello/',
        visibility: 'members',
        publishedAt: '2026-01-05T10:00:00.000Z',
      },
      decoration,
    );

    expect(item.metaText).toBe('5 Jan 2026');
    expect(item.metaIconTitle).toBe('Members only');
    expect(item.MetaIcon).toBeDefined();
  });

  it.each([
    ['paid', 'Paid-members only'],
    ['tiers', 'Specific tiers only'],
  ])('marks %s content', (visibility, title) => {
    const item = decoratePostSearchResult({ id: 'post.1', title: 'Hello', visibility }, decoration);

    expect(item.metaIconTitle).toBe(title);
  });

  it('adds no marker when members are disabled or content is public', () => {
    expect(
      decoratePostSearchResult(
        { id: 'post.1', title: 'Hello', visibility: 'paid' },
        { ...decoration, membersEnabled: false },
      ).MetaIcon,
    ).toBeUndefined();
    expect(
      decoratePostSearchResult({ id: 'post.1', title: 'Hello', visibility: 'public' }, decoration)
        .MetaIcon,
    ).toBeUndefined();
  });
});

describe('filterLinkSearchResults', () => {
  it('keeps only linkable published content and decorates posts and pages', () => {
    const groups = filterLinkSearchResults(
      [
        {
          groupName: 'Staff',
          options: [
            { id: 'user.1', title: 'Ann', url: 'https://example.com/author/ann/' },
            { id: 'user.2', title: 'Bob', url: 'https://example.com/404/' },
          ],
        },
        { groupName: 'Tags', options: [{ id: 'tag.1', title: 'News', url: null }] },
        {
          groupName: 'Posts',
          options: [
            { id: 'post.1', title: 'Draft', url: 'https://example.com/p/1/', status: 'draft' },
            {
              id: 'post.2',
              title: 'Live',
              url: 'https://example.com/live/',
              status: 'published',
              visibility: 'paid',
              publishedAt: '2026-02-02T00:00:00.000Z',
            },
          ],
        },
        {
          groupName: 'Pages',
          options: [
            {
              id: 'page.1',
              title: 'About',
              url: 'https://example.com/about/',
              status: 'published',
            },
          ],
        },
      ],
      decoration,
    );

    expect(groups.map((group) => group.label)).toEqual(['Staff', 'Posts', 'Pages']);
    expect(groups[0].items.map((item) => item.title)).toEqual(['Ann']);
    expect(groups[1].items).toHaveLength(1);
    expect(groups[1].items[0]).toMatchObject({
      title: 'Live',
      metaText: '2 Feb 2026',
      metaIconTitle: 'Paid-members only',
    });
    expect(groups[2].items[0].title).toBe('About');
  });
});

describe('buildLatestPostsGroup', () => {
  it('wraps the latest posts in a decorated group', () => {
    const groups = buildLatestPostsGroup(
      [
        {
          id: '1',
          title: 'Latest',
          url: 'https://example.com/latest/',
          visibility: 'public',
          published_at: '2026-04-10T00:00:00.000Z',
        },
      ],
      decoration,
    );

    expect(groups).toEqual([
      {
        label: 'Latest posts',
        items: [expect.objectContaining({ id: '1', title: 'Latest', metaText: '10 Apr 2026' })],
      },
    ]);
  });
});

describe('search index groups', () => {
  const posts = [
    { id: '1', title: 'Getting started', url: '/start/', status: 'published' },
    { id: '2', title: 'Other', url: '/other/', status: 'published' },
  ];

  it('matches post titles case-insensitively', () => {
    expect(searchIndexPostsGroup('Posts', posts, 'STARTED').options).toEqual([
      expect.objectContaining({ id: 'post.1', title: 'Getting started', url: '/start/' }),
    ]);
  });

  it('matches staff and tag names', () => {
    expect(
      searchIndexEntitiesGroup('Staff', [{ id: 'u1', name: 'Ann Author', url: '/ann/' }], 'ann')
        .options,
    ).toEqual([{ id: 'user.u1', title: 'Ann Author', url: '/ann/' }]);
    expect(
      searchIndexEntitiesGroup('Tags', [{ id: 't1', name: 'News', url: '/tag/news/' }], 'ne')
        .options,
    ).toEqual([{ id: 'tag.t1', title: 'News', url: '/tag/news/' }]);
  });

  it('matches nothing for a blank term', () => {
    expect(searchIndexPostsGroup('Pages', posts, '  ').options).toEqual([]);
  });
});
