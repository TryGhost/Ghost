import {describe, expect, it} from 'vitest';
import {getPostMetricColumns, hasPostAnalyticsPage, type PostMetricsSettings} from './post-metrics';
import type {PostListItem} from './hooks/use-posts-list';

/**
 * Which metric columns a row shows. Ported from `list-item-analytics.hbs` and
 * the `showEmail*Analytics` / `showAttributionAnalytics` computeds in
 * `apps/ember-admin/app/models/post.js`.
 *
 * Genuinely fiddly, and invisible unless you happen to have a site configured
 * the wrong way — hence the exhaustive table.
 */

const settings = (overrides: Partial<PostMetricsSettings> = {}): PostMetricsSettings => ({
    webAnalyticsEnabled: false,
    membersTrackSources: false,
    emailTrackOpens: false,
    emailTrackClicks: false,
    membersSignupAccess: 'all',
    isMembersInviteOnly: false,
    isContributor: false,
    ...overrides
});

const post = (overrides: Partial<PostListItem> = {}): PostListItem => ({
    id: 'p1',
    uuid: 'u1',
    url: 'https://example.com/p',
    slug: 'p',
    title: 'A post',
    status: 'published',
    ...overrides
});

const emailed = (over: Partial<PostListItem> = {}) => post({
    email: {status: 'submitted', email_count: 100, opened_count: 40, track_opens: true, track_clicks: true},
    ...over
});

const keys = (...args: Parameters<typeof getPostMetricColumns>) =>
    getPostMetricColumns(...args).map(column => column.key);

describe('the Visitors column', () => {
    it('shows for a published post when web analytics is on', () => {
        expect(keys(post(), settings({webAnalyticsEnabled: true}), 'posts')).toContain('visitors');
    });

    it('hides when web analytics is off', () => {
        expect(keys(post(), settings(), 'posts')).not.toContain('visitors');
    });

    it('hides for a draft', () => {
        expect(keys(post({status: 'draft'}), settings({webAnalyticsEnabled: true}), 'posts'))
            .not.toContain('visitors');
    });

    // Strictly `published`, so an email-only post has no web traffic column.
    it('hides for an email-only post', () => {
        expect(keys(post({status: 'sent'}), settings({webAnalyticsEnabled: true}), 'posts'))
            .not.toContain('visitors');
    });
});

describe('the email columns', () => {
    it('shows Opens when both the post and the site track opens', () => {
        expect(keys(emailed(), settings({emailTrackOpens: true}), 'posts')).toContain('opens');
    });

    it('hides Opens when the site has tracking off', () => {
        expect(keys(emailed(), settings(), 'posts')).not.toContain('opens');
    });

    it('hides Opens when the post itself was sent without tracking', () => {
        const untracked = emailed({
            email: {status: 'submitted', email_count: 100, opened_count: 0, track_opens: false, track_clicks: true}
        });

        expect(keys(untracked, settings({emailTrackOpens: true}), 'posts')).not.toContain('opens');
    });

    it('shows Clicks under the same rules', () => {
        expect(keys(emailed(), settings({emailTrackClicks: true}), 'posts')).toContain('clicks');
        expect(keys(emailed(), settings(), 'posts')).not.toContain('clicks');
    });

    // The one that is easy to get wrong: Sent is a *fallback*, shown only when
    // neither of the others is.
    it('shows Sent only when neither Opens nor Clicks is shown', () => {
        expect(keys(emailed(), settings(), 'posts')).toContain('sent');
        expect(keys(emailed(), settings({emailTrackOpens: true}), 'posts')).not.toContain('sent');
        expect(keys(emailed(), settings({emailTrackClicks: true}), 'posts')).not.toContain('sent');
    });

    it('shows nothing email-related for a post that was never emailed', () => {
        const shown = keys(post(), settings({emailTrackOpens: true, emailTrackClicks: true}), 'posts');

        expect(shown).not.toContain('opens');
        expect(shown).not.toContain('clicks');
        expect(shown).not.toContain('sent');
    });

    it('hides the tracked columns when members signup is switched off entirely', () => {
        const shown = keys(emailed(), settings({
            emailTrackOpens: true, emailTrackClicks: true, membersSignupAccess: 'none'
        }), 'posts');

        expect(shown).not.toContain('opens');
        expect(shown).not.toContain('clicks');
        // ...but Sent still appears, since it only depends on there being an email.
        expect(shown).toContain('sent');
    });
});

describe('the Members column', () => {
    it('shows for a published post when source tracking is on', () => {
        expect(keys(post(), settings({membersTrackSources: true}), 'posts')).toContain('members');
    });

    // The column's gate in the template is only "source tracking on, and
    // published". The invite-only and email-only exclusions belong to
    // `showAttributionAnalytics`, which decides the *trailing button*, not this
    // column — Ember shows a Members number here on an invite-only site.
    it('shows on an invite-only site, where the analytics button does not', () => {
        const inviteOnly = settings({membersTrackSources: true, isMembersInviteOnly: true});

        expect(keys(post(), inviteOnly, 'posts')).toContain('members');
        expect(hasPostAnalyticsPage(post(), inviteOnly, 'posts', true)).toBe(false);
    });

    it('shows for an email-only post, where the analytics button does not', () => {
        const emailOnly = post({status: 'published', email_only: true});
        const tracking = settings({membersTrackSources: true});

        expect(keys(emailOnly, tracking, 'posts')).toContain('members');
        expect(hasPostAnalyticsPage(emailOnly, tracking, 'posts', true)).toBe(false);
    });

    it('shows for a published page', () => {
        expect(keys(post(), settings({membersTrackSources: true}), 'pages')).toContain('members');
    });

    it('hides for an unpublished post', () => {
        expect(keys(post({status: 'draft'}), settings({membersTrackSources: true}), 'posts'))
            .not.toContain('members');
    });
});

describe('contributors', () => {
    // Ember gates opens/clicks on `!isContributor` inside the computeds, but
    // the Visitors and Members columns are gated in the template on the site
    // settings alone — a contributor does see those on their own posts.
    it('see no newsletter rates, but do see the site-level columns', () => {
        const shown = keys(emailed(), settings({
            webAnalyticsEnabled: true,
            membersTrackSources: true,
            emailTrackOpens: true,
            emailTrackClicks: true,
            isContributor: true
        }), 'posts');

        expect(shown).not.toContain('opens');
        expect(shown).not.toContain('clicks');
        // Sent is the fallback, and it depends only on there being an email.
        expect(shown).toEqual(['visitors', 'sent', 'members']);
    });

    it('never get an analytics page', () => {
        expect(hasPostAnalyticsPage(emailed(), settings({
            webAnalyticsEnabled: true,
            membersTrackSources: true,
            emailTrackOpens: true,
            emailTrackClicks: true,
            isContributor: true
        }), 'posts', false)).toBe(false);
    });
});

describe('column order', () => {
    it('reads visitors, opens, clicks, then members', () => {
        expect(keys(emailed(), settings({
            webAnalyticsEnabled: true,
            membersTrackSources: true,
            emailTrackOpens: true,
            emailTrackClicks: true
        }), 'posts')).toEqual(['visitors', 'opens', 'clicks', 'members']);
    });
});

describe('hasPostAnalyticsPage', () => {
    const emailedPost = {
        id: '1',
        status: 'published',
        email: {opened_count: 5, email_count: 10, track_opens: true, track_clicks: true}
    } as PostListItem;

    const tracked = settings({emailTrackOpens: true});

    it('is true for an admin on a post with newsletter engagement', () => {
        expect(hasPostAnalyticsPage(emailedPost, tracked, 'posts', true)).toBe(true);
    });

    it('is false for a non-admin, however the post is configured', () => {
        expect(hasPostAnalyticsPage(emailedPost, tracked, 'posts', false)).toBe(false);
    });

    it('is false for pages, which have no analytics screen', () => {
        expect(hasPostAnalyticsPage(emailedPost, tracked, 'pages', true)).toBe(false);
    });

    // The distinction the Ember computed makes and the columns don't: web
    // analytics alone does not earn a post an analytics page.
    it('is false when only the Visitors column shows', () => {
        const webOnlyPost = {id: '1', status: 'published'} as PostListItem;
        const onlyWeb = settings({webAnalyticsEnabled: true, membersTrackSources: false});

        expect(getPostMetricColumns(webOnlyPost, onlyWeb, 'posts').map(column => column.key)).toEqual(['visitors']);
        expect(hasPostAnalyticsPage(webOnlyPost, onlyWeb, 'posts', true)).toBe(false);
    });

    // The most common real configuration — source tracking on, newsletter
    // tracking off — and the one the email-shaped cases above would miss.
    it('is true on the attribution path alone, with no email at all', () => {
        const published = {id: '1', status: 'published'} as PostListItem;

        expect(hasPostAnalyticsPage(published, settings({membersTrackSources: true}), 'posts', true)).toBe(true);
    });

    // An emailed post with tracking off shows a Sent column but earns no page.
    it('is false when the only email column is the Sent fallback', () => {
        const untracked = settings();

        expect(getPostMetricColumns(emailedPost, untracked, 'posts').map(column => column.key))
            .toEqual(['sent']);
        expect(hasPostAnalyticsPage(emailedPost, untracked, 'posts', true)).toBe(false);
    });

    it('is false for a contributor even where the settings would allow it', () => {
        const asContributor = settings({
            emailTrackOpens: true, membersTrackSources: true, isContributor: true
        });

        expect(hasPostAnalyticsPage(emailedPost, asContributor, 'posts', true)).toBe(false);
    });
});
