import {describe, expect, it} from 'vitest';
import {parseMemberEvent} from './member-event';

// Ports Ember `helpers/parse-member-event.js`. The Ember helper is a Glimmer
// component with injected services (`membersUtils`, `feature`); we take those
// as an explicit context object so the pure function stays testable.

function ev(type: string, data: Record<string, unknown> = {}) {
    return {
        type,
        data: {
            created_at: '2026-01-15T12:00:00.000Z',
            ...data
        }
    };
}

const defaultCtx = {hasMultipleNewsletters: false, hasMultipleTiers: false, paidMembersEnabled: false};

describe('parseMemberEvent — subject', () => {
    it('uses member.name when trimmed non-empty', () => {
        const parsed = parseMemberEvent(ev('signup_event', {member: {name: '  Ada  ', email: 'ada@x.co'}}), defaultCtx);
        expect(parsed.subject).toBe('Ada');
    });

    it('falls back to member.email when name is empty/whitespace', () => {
        const parsed = parseMemberEvent(ev('signup_event', {member: {name: '   ', email: 'ada@x.co'}}), defaultCtx);
        expect(parsed.subject).toBe('ada@x.co');
    });

    it('falls back to top-level name/email when member is absent (guest event)', () => {
        expect(parseMemberEvent(ev('signup_event', {name: 'X'}), defaultCtx).subject).toBe('X');
        expect(parseMemberEvent(ev('signup_event', {email: 'x@x.co'}), defaultCtx).subject).toBe('x@x.co');
        expect(parseMemberEvent(ev('signup_event'), defaultCtx).subject).toBe('');
    });
});

describe('parseMemberEvent — icon', () => {
    // Icon names are prefixed with `event-` (Ember `getIcon` return).
    const cases: Array<[string, Record<string, unknown>, string]> = [
        ['login_event', {}, 'event-logged-in'],
        ['signup_event', {}, 'event-signed-up'],
        ['payment_event', {}, 'event-subscriptions'],
        ['newsletter_event', {subscribed: true}, 'event-subscribed-to-email'],
        ['newsletter_event', {subscribed: false}, 'event-unsubscribed-from-email'],
        ['subscription_event', {type: 'created'}, 'event-subscriptions'],
        ['subscription_event', {type: 'canceled'}, 'event-canceled-subscription'],
        // Ember special-case: subscription_event + signup flag renders as signup.
        ['subscription_event', {type: 'created', signup: true}, 'event-signed-up'],
        ['email_opened_event', {}, 'event-opened-email'],
        ['email_delivered_event', {}, 'event-received-email'],
        ['email_failed_event', {}, 'event-email-delivery-failed'],
        ['email_complaint_event', {}, 'event-email-delivery-spam'],
        ['email_change_event', {}, 'event-email-changed'],
        ['comment_event', {}, 'event-comment'],
        ['click_event', {}, 'event-click'],
        ['aggregated_click_event', {}, 'event-click'],
        ['feedback_event', {score: 1}, 'event-more-like-this'],
        ['feedback_event', {score: 0}, 'event-less-like-this'],
        ['donation_event', {}, 'event-subscriptions'],
        ['gift_purchase_event', {}, 'event-gift'],
        ['gift_redemption_event', {}, 'event-gift'],
        ['gift_ended_event', {}, 'event-gift'],
        ['automated_email_sent_event', {}, 'event-sent-email']
    ];
    it.each(cases)('%s (%j) → %s', (type, data, expected) => {
        expect(parseMemberEvent(ev(type, data), defaultCtx).icon).toBe(expected);
    });
});

describe('parseMemberEvent — action text', () => {
    it('signup_event → "signed up"', () => {
        expect(parseMemberEvent(ev('signup_event'), defaultCtx).action).toBe('signed up');
    });

    it('subscription_event created with signup flag → "signed up"', () => {
        // Ember-parity — the same event type covers both flows depending on context.
        expect(parseMemberEvent(ev('subscription_event', {type: 'created', signup: true}), defaultCtx).action).toBe('signed up');
    });

    it('subscription_event created without signup flag → "started paid subscription"', () => {
        expect(parseMemberEvent(ev('subscription_event', {type: 'created'}), defaultCtx).action).toBe('started paid subscription');
    });

    it('subscription_event canceled/reactivated/expired/updated', () => {
        expect(parseMemberEvent(ev('subscription_event', {type: 'canceled'}), defaultCtx).action).toBe('canceled paid subscription');
        expect(parseMemberEvent(ev('subscription_event', {type: 'reactivated'}), defaultCtx).action).toBe('reactivated paid subscription');
        expect(parseMemberEvent(ev('subscription_event', {type: 'expired'}), defaultCtx).action).toBe('ended paid subscription');
        expect(parseMemberEvent(ev('subscription_event', {type: 'updated'}), defaultCtx).action).toBe('changed paid subscription');
    });

    it('newsletter_event without hasMultipleNewsletters → generic "newsletter"', () => {
        const parsed = parseMemberEvent(ev('newsletter_event', {subscribed: true, newsletter: {name: 'Weekly'}}), defaultCtx);
        expect(parsed.action).toBe('subscribed to newsletter');
    });

    it('newsletter_event with hasMultipleNewsletters → uses newsletter.name', () => {
        const parsed = parseMemberEvent(ev('newsletter_event', {subscribed: false, newsletter: {name: 'Weekly'}}), {...defaultCtx, hasMultipleNewsletters: true});
        expect(parsed.action).toBe('unsubscribed from Weekly');
    });

    it('comment_event with parent → "replied to comment"', () => {
        expect(parseMemberEvent(ev('comment_event', {parent: {id: 'c1'}}), defaultCtx).action).toBe('replied to comment');
    });

    it('comment_event without parent → "commented"', () => {
        expect(parseMemberEvent(ev('comment_event'), defaultCtx).action).toBe('commented');
    });

    it('feedback_event with score 1/0', () => {
        expect(parseMemberEvent(ev('feedback_event', {score: 1}), defaultCtx).action).toBe('more like this');
        expect(parseMemberEvent(ev('feedback_event', {score: 0}), defaultCtx).action).toBe('less like this');
    });

    it('email_change_event with from/to fields', () => {
        expect(parseMemberEvent(ev('email_change_event', {from_email: 'a@x.co', to_email: 'b@x.co'}), defaultCtx).action).toBe('Email address changed from a@x.co to b@x.co');
    });

    it('email_change_event without from/to → generic', () => {
        expect(parseMemberEvent(ev('email_change_event'), defaultCtx).action).toBe('Email address changed');
    });

    it('automated_email_sent_event with free/paid slug → welcome (Free/Paid)', () => {
        expect(parseMemberEvent(ev('automated_email_sent_event', {automatedEmail: {slug: 'welcome-free'}}), defaultCtx).action).toBe('received welcome email (Free)');
        expect(parseMemberEvent(ev('automated_email_sent_event', {automatedEmail: {slug: 'welcome-paid'}}), defaultCtx).action).toBe('received welcome email (Paid)');
    });

    it('automated_email_sent_event from automation → uses subject', () => {
        const parsed = parseMemberEvent(ev('automated_email_sent_event', {automatedEmail: {source: 'automation_action_revision', subject: '  Hi there  '}}), defaultCtx);
        expect(parsed.action).toBe('received automated email: Hi there');
        expect(parsed.actionTitle).toBe('received automated email: Hi there');
    });

    it('automated_email_sent_event with missing/empty subject → subject-less copy (no "null" leak)', () => {
        // Regression guard for the "received automated email: null" bug —
        // `trimString` returns null when subject is missing or empty, and a
        // template literal used to interpolate the literal string "null".
        const missing = parseMemberEvent(ev('automated_email_sent_event', {automatedEmail: {source: 'automation_action_revision'}}), defaultCtx);
        expect(missing.action).toBe('received automated email');
        expect(missing.actionTitle).toBe('received automated email');
        const blank = parseMemberEvent(ev('automated_email_sent_event', {automatedEmail: {source: 'automation_action_revision', subject: '   '}}), defaultCtx);
        expect(blank.action).toBe('received automated email');
        expect(blank.actionTitle).toBe('received automated email');
    });
});

describe('parseMemberEvent — object / url / route', () => {
    it('signup with attribution renders title as object with url + route', () => {
        const parsed = parseMemberEvent(ev('signup_event', {
            attribution: {title: 'My Post', url: '/my-post/', referrer_source: 'Twitter', referrer_url: 'https://t.co'},
            attribution_type: 'post',
            attribution_id: 'p_1'
        }), defaultCtx);
        expect(parsed.object).toBe('My Post');
        expect(parsed.url).toBe('/my-post/');
        expect(parsed.route).toBe('#/posts/analytics/p_1');
        expect(parsed.source).toEqual({name: 'Twitter', url: 'https://t.co'});
    });

    it('comment_event with post → object=title, url=post.url, no route', () => {
        const parsed = parseMemberEvent(ev('comment_event', {post: {title: 'Post', url: '/post/', id: 'p_x'}}), defaultCtx);
        expect(parsed.object).toBe('Post');
        expect(parsed.url).toBe('/post/');
        // Ember `getRoute` doesn't include comment_event.
        expect(parsed.route).toBeUndefined();
    });

    it('click_event with post → object + route to post analytics', () => {
        const parsed = parseMemberEvent(ev('click_event', {post: {title: 'Post', url: '/post/', id: 'p_c'}}), defaultCtx);
        expect(parsed.object).toBe('Post');
        expect(parsed.route).toBe('#/posts/analytics/p_c');
    });

    it('no attribution → empty object, undefined url/route', () => {
        const parsed = parseMemberEvent(ev('signup_event'), defaultCtx);
        expect(parsed.object).toBe('');
        expect(parsed.url).toBeUndefined();
        expect(parsed.route).toBeUndefined();
    });
});

describe('parseMemberEvent — info', () => {
    it('signup_event on paid-members-enabled site → "Free" for free signups', () => {
        const parsed = parseMemberEvent(ev('signup_event', {created_with_status: 'free'}), {...defaultCtx, paidMembersEnabled: true});
        expect(parsed.info).toBe('Free');
    });

    it('signup_event on paid-members-enabled site with paid signup → null (info suppressed)', () => {
        const parsed = parseMemberEvent(ev('signup_event', {created_with_status: 'paid'}), {...defaultCtx, paidMembersEnabled: true});
        expect(parsed.info).toBeNull();
    });

    it('signup_event on paid-disabled site → undefined', () => {
        expect(parseMemberEvent(ev('signup_event'), defaultCtx).info).toBeUndefined();
    });

    it('gift_redemption_event → tier name', () => {
        expect(parseMemberEvent(ev('gift_redemption_event', {tier_name: 'Gold'}), defaultCtx).info).toBe('Gold');
    });
});

describe('parseMemberEvent — gift purchase amount formatting', () => {
    it('formats gift purchase with amount, tier, and duration (Ember parity)', () => {
        const parsed = parseMemberEvent(ev('gift_purchase_event', {
            amount: 5000,
            currency: 'usd',
            tier_name: 'Gold',
            duration: 3,
            cadence: 'month'
        }), defaultCtx);
        // Ember: "Purchased gift subscription for $50 (Gold, 3 months)"
        expect(parsed.action).toBe('Purchased gift subscription for $50 (Gold, 3 months)');
    });

    it('keeps the cents on an amount that has them', () => {
        // A whole amount formats the same whether or not fraction digits are
        // suppressed, so it can't catch rounding. This one can: $10.50 must not
        // be reported as $11.
        const parsed = parseMemberEvent(ev('gift_purchase_event', {
            amount: 1050,
            currency: 'usd',
            tier_name: 'Gold',
            duration: 1,
            cadence: 'month'
        }), defaultCtx);
        expect(parsed.action).toBe('Purchased gift subscription for $10.50 (Gold, 1 month)');
    });

    it('does not divide zero-decimal currencies by 100', () => {
        // 1050 JPY is ¥1,050, not ¥10.50 — yen has no minor unit.
        const parsed = parseMemberEvent(ev('gift_purchase_event', {
            amount: 1050,
            currency: 'jpy',
            tier_name: 'Gold',
            duration: 1,
            cadence: 'month'
        }), defaultCtx);
        expect(parsed.action).toBe('Purchased gift subscription for ¥1,050 (Gold, 1 month)');
    });

    it('pluralizes cadence based on duration', () => {
        const one = parseMemberEvent(ev('gift_purchase_event', {
            amount: 5000, currency: 'usd', tier_name: 'Gold', duration: 1, cadence: 'month'
        }), defaultCtx);
        expect(one.action).toContain('(Gold, 1 month)');
    });

    it('handles zero-decimal currencies without dividing by 100 (JPY)', () => {
        const parsed = parseMemberEvent(ev('gift_purchase_event', {
            amount: 5000, currency: 'jpy', tier_name: 'Gold', duration: 1, cadence: 'month'
        }), defaultCtx);
        // Naive `/100` would render ¥50; the zero-decimal branch keeps ¥5,000.
        expect(parsed.action).toMatch(/¥5,000/);
    });

    it('falls back gracefully when purchase data is missing', () => {
        expect(parseMemberEvent(ev('gift_purchase_event'), defaultCtx).action).toBe('Purchased gift subscription');
    });
});

describe('parseMemberEvent — meta', () => {
    it('surfaces server event.data.id for use as a stable React key', () => {
        const parsed = parseMemberEvent(ev('signup_event', {id: 'ev_1'}), defaultCtx);
        expect(parsed.id).toBe('ev_1');
    });

    it('returns undefined timestamp when data.created_at is missing (defensive — render layer decides how to show it)', () => {
        const raw = {type: 'signup_event', data: {}} as {type: string; data: {created_at?: string}};
        expect(parseMemberEvent(raw, defaultCtx).timestamp).toBeUndefined();
    });

    it('normalizes memberId + trims member.name', () => {
        const parsed = parseMemberEvent(ev('signup_event', {member_id: 'm_1', member: {name: '  Ada  ', email: 'ada@x.co'}}), defaultCtx);
        expect(parsed.memberId).toBe('m_1');
        expect(parsed.member?.name).toBe('Ada');
    });

    it('falls back to member.id when member_id is missing', () => {
        const parsed = parseMemberEvent(ev('signup_event', {member: {id: 'm_2', name: 'X', email: 'x@x.co'}}), defaultCtx);
        expect(parsed.memberId).toBe('m_2');
    });

    it('description for click_event returns the link.to URL (raw fallback)', () => {
        expect(parseMemberEvent(ev('click_event', {link: {to: 'https://example.com/a?ref=x'}}), defaultCtx).description).toBe('https://example.com/a?ref=x');
    });

    it('timestamp is an ISO-parseable value (Date-like)', () => {
        // We use a plain string ISO input; the parser returns something usable
        // by JS date formatters. Exact toISOString equality avoids TZ flakes.
        const parsed = parseMemberEvent(ev('signup_event'), defaultCtx);
        expect(new Date(parsed.timestamp!).toISOString()).toBe('2026-01-15T12:00:00.000Z');
    });
});
