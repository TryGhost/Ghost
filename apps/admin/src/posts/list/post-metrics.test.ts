import {describe, expect, it} from 'vitest';
import {getPostMetricColumns, type PostMetricsSettings} from './post-metrics';
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

    it('hides on an invite-only site', () => {
        expect(keys(post(), settings({membersTrackSources: true, isMembersInviteOnly: true}), 'posts'))
            .not.toContain('members');
    });

    it('hides for an email-only post', () => {
        expect(keys(post({status: 'sent', email_only: true}), settings({membersTrackSources: true}), 'posts'))
            .not.toContain('members');
    });

    // A page is never email-only, so the exclusion doesn't apply to it.
    it('shows for a published page', () => {
        expect(keys(post(), settings({membersTrackSources: true}), 'pages')).toContain('members');
    });
});

describe('contributors', () => {
    // Contributors see no analytics at all.
    it('see no metric columns', () => {
        expect(keys(emailed(), settings({
            webAnalyticsEnabled: true,
            membersTrackSources: true,
            emailTrackOpens: true,
            emailTrackClicks: true,
            isContributor: true
        }), 'posts')).toEqual([]);
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
