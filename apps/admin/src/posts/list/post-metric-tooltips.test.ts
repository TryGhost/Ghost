import {describe, expect, it} from 'vitest';
import {getPostMetricTooltip} from './post-metric-tooltips';
import type {PostListItem} from './hooks/use-posts-list';

const post = (overrides: Partial<PostListItem> = {}): PostListItem => ({
    id: 'p1', uuid: 'u1', url: 'u', slug: 'p', title: 'A post', status: 'published', ...overrides
});

const emailed = post({
    email: {status: 'submitted', email_count: 200, opened_count: 100},
    count: {clicks: 20}
});

const base = {showOpens: true, showClicks: true};

describe('getPostMetricTooltip', () => {
    it('titles the visitor tooltip "Web traffic"', () => {
        expect(getPostMetricTooltip('visitors', post(), {...base, visitors: 42})).toEqual({
            title: 'Web traffic',
            rows: [{label: 'Unique visitors', value: 42, icon: 'visitors'}]
        });
    });

    // All three email columns share one panel in Ember.
    //
    // The values are the raw counts, not the rates the columns show. The
    // fixture is chosen so the two are distinguishable: the Opens column reads
    // 50% while the panel reads 100, and Clicks reads 10% against 20.
    it.each(['opens', 'clicks', 'sent'] as const)('shows the same newsletter panel for %s', (key) => {
        expect(getPostMetricTooltip(key, emailed, base)).toEqual({
            title: 'Newsletter performance',
            rows: [
                {label: 'Sent', value: 200, icon: 'sent'},
                {label: 'Opens', value: 100, icon: 'opens'},
                {label: 'Clicks', value: 20, icon: 'clicks'}
            ]
        });
    });

    it('lists only what is being tracked', () => {
        expect(getPostMetricTooltip('sent', emailed, {showOpens: false, showClicks: false}).rows)
            .toEqual([{label: 'Sent', value: 200, icon: 'sent'}]);
    });

    it('breaks new members into free and paid', () => {
        expect(getPostMetricTooltip('members', post(), {
            ...base, freeMembers: 69, paidMembers: 19, paidMembersEnabled: true
        })).toEqual({
            title: 'New members',
            rows: [{label: 'Free', value: 69, icon: 'free'}, {label: 'Paid', value: 19, icon: 'paid'}]
        });
    });

    // Ember drops the row entirely rather than showing a zero.
    it('omits paid when paid members are off', () => {
        expect(getPostMetricTooltip('members', post(), {
            ...base, freeMembers: 69, paidMembersEnabled: false
        }).rows).toEqual([{label: 'Free', value: 69, icon: 'free'}]);
    });
});
