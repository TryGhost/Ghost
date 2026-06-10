import {capitalizeFirstLetter, cleanTrackedUrl, parseMemberEvent} from './parse-member-event';
import {describe, expect, it} from 'vitest';
import type {MemberEvent} from '@tryghost/admin-x-framework/api/members';
import type {ParseEventContext} from './parse-member-event';

const defaultContext: ParseEventContext = {
    hasMultipleNewsletters: false,
    hasMultipleTiers: false,
    paidMembersEnabled: false
};

function makeEvent(type: string, data: Record<string, unknown> = {}): MemberEvent {
    return {
        id: 'event-1',
        type,
        data: {
            created_at: '2025-06-01T10:00:00.000Z',
            member_id: 'member-1',
            member: {id: 'member-1', name: 'Jane Member', email: 'jane@example.com'},
            ...data
        }
    } as MemberEvent;
}

function parse(type: string, data: Record<string, unknown> = {}, context: Partial<ParseEventContext> = {}) {
    return parseMemberEvent(makeEvent(type, data), {...defaultContext, ...context});
}

describe('parseMemberEvent', () => {
    it('extracts the member subject and timestamp', () => {
        const event = parse('login_event');

        expect(event.memberId).toBe('member-1');
        expect(event.subject).toBe('Jane Member');
        expect(event.timestamp).toBe('2025-06-01T10:00:00.000Z');
    });

    it('falls back to the member email when the name is blank', () => {
        const event = parse('login_event', {member: {id: 'member-1', name: '   ', email: 'jane@example.com'}});

        expect(event.subject).toBe('jane@example.com');
        expect(event.member?.name).toBeNull();
    });

    describe('icons', () => {
        const cases: Array<[string, Record<string, unknown>, string]> = [
            ['login_event', {}, 'event-logged-in'],
            ['payment_event', {}, 'event-subscriptions'],
            ['newsletter_event', {subscribed: true}, 'event-subscribed-to-email'],
            ['newsletter_event', {subscribed: false}, 'event-unsubscribed-from-email'],
            ['subscription_event', {type: 'updated'}, 'event-subscriptions'],
            ['subscription_event', {type: 'canceled'}, 'event-canceled-subscription'],
            ['subscription_event', {type: 'created', signup: true}, 'event-signed-up'],
            ['signup_event', {}, 'event-signed-up'],
            ['email_opened_event', {}, 'event-opened-email'],
            ['email_sent_event', {}, 'event-sent-email'],
            ['automated_email_sent_event', {}, 'event-sent-email'],
            ['email_delivered_event', {}, 'event-received-email'],
            ['email_failed_event', {}, 'event-email-delivery-failed'],
            ['email_complaint_event', {}, 'event-email-delivery-spam'],
            ['comment_event', {}, 'event-comment'],
            ['click_event', {}, 'event-click'],
            ['aggregated_click_event', {count: {clicks: 2}}, 'event-click'],
            ['feedback_event', {score: 1}, 'event-more-like-this'],
            ['feedback_event', {score: 0}, 'event-less-like-this'],
            ['donation_event', {}, 'event-subscriptions'],
            ['gift_purchase_event', {amount: 500, currency: 'usd', tier_name: 'Gold', duration: 1, cadence: 'month'}, 'event-gift'],
            ['gift_redemption_event', {}, 'event-gift'],
            ['gift_ended_event', {}, 'event-gift'],
            ['email_change_event', {}, 'event-email-changed']
        ];

        it.each(cases)('%s -> %s', (type, data, icon) => {
            expect(parse(type, data).icon).toBe(icon);
        });
    });

    describe('actions', () => {
        it('handles auth and signup events', () => {
            expect(parse('signup_event').action).toBe('signed up');
            expect(parse('login_event').action).toBe('logged in');
            expect(parse('subscription_event', {type: 'created', signup: true}).action).toBe('signed up');
        });

        it('handles newsletter events with and without multiple newsletters', () => {
            expect(parse('newsletter_event', {subscribed: true}).action).toBe('subscribed to newsletter');
            expect(parse('newsletter_event', {subscribed: false}).action).toBe('unsubscribed from newsletter');
            expect(parse('newsletter_event', {subscribed: true, newsletter: {name: 'Weekly'}}, {hasMultipleNewsletters: true}).action)
                .toBe('subscribed to Weekly');
        });

        it('handles subscription lifecycle events', () => {
            expect(parse('subscription_event', {type: 'created'}).action).toBe('started paid subscription');
            expect(parse('subscription_event', {type: 'updated'}).action).toBe('changed paid subscription');
            expect(parse('subscription_event', {type: 'canceled'}).action).toBe('canceled paid subscription');
            expect(parse('subscription_event', {type: 'reactivated'}).action).toBe('reactivated paid subscription');
            expect(parse('subscription_event', {type: 'expired'}).action).toBe('ended paid subscription');
            expect(parse('subscription_event', {type: 'unknown'}).action).toBe('changed paid subscription');
        });

        it('handles email events', () => {
            expect(parse('email_opened_event').action).toBe('opened email');
            expect(parse('email_sent_event').action).toBe('sent email');
            expect(parse('email_delivered_event').action).toBe('received email');
            expect(parse('email_failed_event').action).toBe('bounced email');
            expect(parse('email_complaint_event').action).toBe('email flagged as spam');
        });

        it('describes welcome emails by automated email slug', () => {
            expect(parse('automated_email_sent_event', {automatedEmail: {slug: 'welcome-free'}}).action)
                .toBe('received welcome email (Free)');
            expect(parse('automated_email_sent_event', {automatedEmail: {slug: 'welcome-paid'}}).action)
                .toBe('received welcome email (Paid)');
            expect(parse('automated_email_sent_event', {}).action)
                .toBe('received welcome email (Free)');
        });

        it('handles comments and replies', () => {
            expect(parse('comment_event').action).toBe('commented');
            expect(parse('comment_event', {parent: {id: 'parent'}}).action).toBe('replied to comment');
        });

        it('handles click and aggregated click events', () => {
            expect(parse('click_event').action).toBe('clicked link in email');
            expect(parse('aggregated_click_event', {count: {clicks: 1}}).action).toBe('clicked link in email');
            expect(parse('aggregated_click_event', {count: {clicks: 3}}).action).toBe('clicked 3 links in email');
        });

        it('handles feedback events', () => {
            expect(parse('feedback_event', {score: 1}).action).toBe('more like this');
            expect(parse('feedback_event', {score: 0}).action).toBe('less like this');
        });

        it('handles email change events', () => {
            expect(parse('email_change_event').action).toBe('Email address changed');
            expect(parse('email_change_event', {from_email: 'a@x.com', to_email: 'b@x.com'}).action)
                .toBe('Email address changed from a@x.com to b@x.com');
        });

        it('handles donations and gifts', () => {
            expect(parse('donation_event').action).toBe('Made a one-time payment');
            expect(parse('gift_purchase_event', {amount: 500, currency: 'usd', tier_name: 'Gold', duration: 1, cadence: 'month'}).action)
                .toBe('Purchased gift subscription for $5 (Gold, 1 month)');
            expect(parse('gift_purchase_event', {amount: 1200, currency: 'usd', tier_name: 'Gold', duration: 3, cadence: 'month'}).action)
                .toBe('Purchased gift subscription for $12 (Gold, 3 months)');
            expect(parse('gift_redemption_event').action).toBe('started gift subscription');
            expect(parse('gift_ended_event').action).toBe('gift subscription expired');
        });

        it('returns an empty action for unknown events', () => {
            expect(parse('unknown_event').action).toBe('');
        });
    });

    describe('info', () => {
        it('shows MRR info for subscription events', () => {
            expect(parse('subscription_event', {type: 'created', mrr_delta: 500, currency: 'usd'}).info)
                .toBe('Paid $5/month');
            expect(parse('subscription_event', {type: 'created', mrr_delta: 500, currency: 'usd', tierName: 'Gold'}, {hasMultipleTiers: true}).info)
                .toBe('Gold $5/month');
            expect(parse('subscription_event', {type: 'updated', mrr_delta: 500, currency: 'usd'}).info)
                .toBe('MRR +$5');
            expect(parse('subscription_event', {type: 'updated', mrr_delta: -500, currency: 'usd'}).info)
                .toBe('MRR -$5');
            expect(parse('subscription_event', {type: 'updated', mrr_delta: 0, currency: 'usd'}).info)
                .toBeNull();
        });

        it('marks free signups when paid members are enabled', () => {
            expect(parse('signup_event', {}, {paidMembersEnabled: true}).info).toBe('Free');
            expect(parse('signup_event', {created_with_status: 'paid'}, {paidMembersEnabled: true}).info).toBeNull();
            expect(parse('signup_event').info).toBeNull();
        });

        it('shows the amount for donations and the tier for gift redemptions', () => {
            expect(parse('donation_event', {amount: 1500, currency: 'usd'}).info).toBe('$15');
            expect(parse('gift_redemption_event', {tier_name: 'Gold'}).info).toBe('Gold');
        });
    });

    describe('objects, urls and routes', () => {
        it('links attribution for signup and subscription events', () => {
            const event = parse('signup_event', {
                attribution: {title: 'A post', url: 'https://site.com/a-post/'},
                attribution_type: 'post',
                attribution_id: 'post-1'
            });

            expect(event.object).toBe('A post');
            expect(event.url).toBe('https://site.com/a-post/');
            expect(event.route).toBe('/posts/analytics/post-1');
        });

        it('links the post for click and feedback events', () => {
            const event = parse('click_event', {post: {id: 'post-1', title: 'A post', url: 'https://site.com/a-post/'}});

            expect(event.object).toBe('A post');
            expect(event.url).toBe('https://site.com/a-post/');
            expect(event.route).toBe('/posts/analytics/post-1');
        });

        it('links the post for comment events without an internal route', () => {
            const event = parse('comment_event', {post: {id: 'post-1', title: 'A post', url: 'https://site.com/a-post/'}});

            expect(event.object).toBe('A post');
            expect(event.url).toBe('https://site.com/a-post/');
            expect(event.route).toBeNull();
        });

        it('extracts the referrer source', () => {
            expect(parse('signup_event', {attribution: {referrer_source: 'Twitter', referrer_url: 'https://twitter.com'}}).source)
                .toEqual({name: 'Twitter', url: 'https://twitter.com'});
            expect(parse('signup_event').source).toBeNull();
        });

        it('cleans the clicked link for click event descriptions', () => {
            expect(parse('click_event', {link: {to: 'https://www.site.com/a-post/?ref=newsletter&keep=1'}}).description)
                .toBe('site.com/a-post/?keep=1');
            expect(parse('click_event', {link: {to: 'not a url'}}).description).toBe('not a url');
            expect(parse('click_event').description).toBeNull();
        });
    });
});

describe('cleanTrackedUrl', () => {
    it('removes tracking params but keeps others', () => {
        expect(cleanTrackedUrl('https://site.com/post/?ref=x&attribution_id=1&attribution_type=post&q=1'))
            .toBe('https://site.com/post/?q=1');
    });

    it('strips the protocol and www for display', () => {
        expect(cleanTrackedUrl('https://www.site.com/post/?ref=x', true)).toBe('site.com/post/');
        expect(cleanTrackedUrl('https://site.com/?ref=x', true)).toBe('site.com');
    });
});

describe('capitalizeFirstLetter', () => {
    it('capitalizes only the first letter', () => {
        expect(capitalizeFirstLetter('signed up')).toBe('Signed up');
        expect(capitalizeFirstLetter('')).toBe('');
    });
});
