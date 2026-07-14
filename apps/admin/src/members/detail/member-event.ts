// Port of Ember `app/helpers/parse-member-event.js`.
// The Ember helper is a Glimmer helper with injected services; we take the
// tiny slice of settings-derived context it actually reads (`hasMultipleTiers`,
// `paidMembersEnabled`, `hasMultipleNewsletters`) as an explicit argument so
// the transform stays pure and testable in vitest — no react context/hooks
// hidden inside.

export interface MemberEventContext {
    hasMultipleNewsletters: boolean;
    hasMultipleTiers: boolean;
    paidMembersEnabled: boolean;
}

export interface RawMemberEvent {
    type: string;
    data: {
        // The framework type marks this optional but the server always sets
        // it. Kept optional here so we can defensively skip rendering when
        // missing rather than showing "a few seconds ago" for stale data.
        created_at?: string;
        // Per-event id; needed by the render layer for a stable React key
        // when several events share a timestamp (server tie-breaks by id).
        id?: string;
        member_id?: string;
        email_id?: string;
        email?: unknown;
        // Nullable to match the framework's `MemberActivityEventMember | null`
        // shape (server sends `null` for guest-generated events with no member
        // record). Uses a structural subset with no index signature so the
        // stricter framework type (which has `uuid`, `avatar_image` etc but no
        // catch-all) is still assignable.
        member?: {
            id?: string;
            name?: string | null;
            email?: string;
        } | null;
        name?: string;
        // The Ember helper reads many arbitrary event-specific fields — the
        // rest come through as `unknown` so we don't over-model this at the
        // seam. Union-ing all shapes here would be a maintenance treadmill.
        [k: string]: unknown;
    };
}

export interface ParsedMemberEvent {
    /** Server-side event id — stable React key across renders/pagination. */
    id: string | undefined;
    memberId: string | undefined;
    member: RawMemberEvent['data']['member'];
    emailId: string | undefined;
    email: unknown;
    icon: string;
    subject: string;
    action: string | undefined;
    actionTitle: string | undefined;
    join: string;
    object: string;
    source: {name: string; url: string | null} | null;
    info: string | null | undefined;
    description: string | undefined;
    url: string | undefined;
    route: string | undefined;
    /** ISO string when the server provided one; `undefined` when missing so the render layer can decide how to display it. */
    timestamp: string | undefined;
}

/**
 * Ember uses `getNonDecimal(amount, currency)` from `ghost-admin/utils/currency`
 * to divide the minor-units integer by the correct denominator per currency
 * (e.g. 100 for USD/EUR, 1 for JPY). We port a minimal version here so the
 * gift-purchase row can display the amount without pulling in the whole utils
 * module. Zero-decimal currencies match the Stripe list.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
    'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
    'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'
]);

function formatEventAmount(amount: number, currency: string): string {
    const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
    const value = isZeroDecimal ? amount : amount / 100;
    // Whole amounts read better without the trailing zeros ($50, not $50.00),
    // but anything with cents must keep them: rounding a $10.50 payment to $11
    // misreports what the member was actually charged.
    const isWhole = value % 1 === 0;
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: isWhole ? 0 : 2,
            maximumFractionDigits: isWhole ? 0 : 2
        }).format(value);
    } catch {
        // Unknown currency code: fall back to a symbol-less amount so the row
        // still renders instead of crashing on Intl's strict validation.
        return `${value}`;
    }
}

function trimString(value: string | null | undefined): string | null {
    return value?.trim() || null;
}

function getIcon(event: RawMemberEvent): string {
    let icon: string | undefined;

    if (event.type === 'login_event') {
        icon = 'logged-in';
    }
    if (event.type === 'payment_event') {
        icon = 'subscriptions';
    }
    if (event.type === 'newsletter_event') {
        icon = event.data.subscribed ? 'subscribed-to-email' : 'unsubscribed-from-email';
    }
    if (event.type === 'subscription_event') {
        icon = 'subscriptions';
        if (event.data.type === 'canceled') {
            icon = 'canceled-subscription';
        }
    }
    // Signup either as a direct event OR as a subscription_event with the
    // `signup` flag — the second happens when a member creates their account
    // via a paid checkout flow.
    if (event.type === 'signup_event' || (event.type === 'subscription_event' && event.data.type === 'created' && event.data.signup)) {
        icon = 'signed-up';
    }
    if (event.type === 'email_opened_event') {
        icon = 'opened-email';
    }
    if (event.type === 'email_sent_event' || event.type === 'automated_email_sent_event') {
        icon = 'sent-email';
    }
    if (event.type === 'email_delivered_event') {
        icon = 'received-email';
    }
    if (event.type === 'email_failed_event') {
        icon = 'email-delivery-failed';
    }
    if (event.type === 'email_complaint_event') {
        icon = 'email-delivery-spam';
    }
    if (event.type === 'comment_event') {
        icon = 'comment';
    }
    if (event.type === 'click_event' || event.type === 'aggregated_click_event') {
        icon = 'click';
    }
    if (event.type === 'feedback_event') {
        icon = event.data.score === 1 ? 'more-like-this' : 'less-like-this';
    }
    if (event.type === 'donation_event') {
        icon = 'subscriptions';
    }
    if (event.type === 'gift_purchase_event' || event.type === 'gift_redemption_event' || event.type === 'gift_ended_event') {
        icon = 'gift';
    }
    if (event.type === 'email_change_event') {
        icon = 'email-changed';
    }
    return `event-${icon}`;
}

function getAction(event: RawMemberEvent, hasMultipleNewsletters: boolean): string | undefined {
    if (event.type === 'signup_event' || (event.type === 'subscription_event' && event.data.type === 'created' && event.data.signup)) {
        return 'signed up';
    }
    if (event.type === 'login_event') {
        return 'logged in';
    }
    if (event.type === 'payment_event') {
        return 'made payment';
    }
    if (event.type === 'newsletter_event') {
        const nl = event.data.newsletter as {name?: string} | undefined;
        const newsletter = hasMultipleNewsletters && nl?.name ? nl.name : 'newsletter';
        return event.data.subscribed ? `subscribed to ${newsletter}` : `unsubscribed from ${newsletter}`;
    }
    if (event.type === 'subscription_event') {
        const t = event.data.type;
        if (t === 'created') {
            return 'started paid subscription';
        }
        if (t === 'canceled') {
            return 'canceled paid subscription';
        }
        if (t === 'reactivated') {
            return 'reactivated paid subscription';
        }
        if (t === 'expired') {
            return 'ended paid subscription';
        }
        return 'changed paid subscription';
    }
    if (event.type === 'email_opened_event') {
        return 'opened email';
    }
    if (event.type === 'email_sent_event') {
        return 'sent email';
    }
    if (event.type === 'automated_email_sent_event') {
        const auto = event.data.automatedEmail as {source?: string; slug?: string; subject?: string} | undefined;
        if (auto?.source !== 'automation_action_revision') {
            const slug = auto?.slug || '';
            const emailType = slug.includes('paid') ? 'Paid' : 'Free';
            return `received welcome email (${emailType})`;
        }
        const subject = trimString(auto.subject);
        // `trimString` returns null on an empty/missing subject; interpolating
        // that yields "received automated email: null". Fall back to the
        // subjectless copy so the feed row reads cleanly.
        return subject ? `received automated email: ${subject}` : 'received automated email';
    }
    if (event.type === 'email_delivered_event') {
        return 'received email';
    }
    if (event.type === 'email_failed_event') {
        return 'bounced email';
    }
    if (event.type === 'email_complaint_event') {
        return 'email flagged as spam';
    }
    if (event.type === 'comment_event') {
        return event.data.parent ? 'replied to comment' : 'commented';
    }
    if (event.type === 'click_event') {
        return 'clicked link in email';
    }
    if (event.type === 'aggregated_click_event') {
        const count = (event.data.count as {clicks?: number} | undefined)?.clicks ?? 1;
        if (count <= 1) {
            return 'clicked link in email';
        }
        return `clicked ${count} links in email`;
    }
    if (event.type === 'feedback_event') {
        return event.data.score === 1 ? 'more like this' : 'less like this';
    }
    if (event.type === 'email_change_event') {
        if (event.data.from_email && event.data.to_email) {
            return `Email address changed from ${event.data.from_email as string} to ${event.data.to_email as string}`;
        }
        return 'Email address changed';
    }
    if (event.type === 'donation_event') {
        return 'Made a one-time payment';
    }
    if (event.type === 'gift_purchase_event') {
        // Matches Ember `parse-member-event.js:277-285` — the amount, tier,
        // and duration are the row's whole story, so drop none of them.
        const amount = event.data.amount as number | undefined;
        const currency = event.data.currency as string | undefined;
        const tierName = event.data.tier_name as string | undefined;
        const duration = event.data.duration as number | undefined;
        const cadence = event.data.cadence as string | undefined;
        if (typeof amount === 'number' && currency && tierName && typeof duration === 'number' && cadence) {
            const formattedAmount = formatEventAmount(amount, currency);
            const cadenceLabel = duration === 1 ? cadence : `${cadence}s`;
            return `Purchased gift subscription for ${formattedAmount} (${tierName}, ${duration} ${cadenceLabel})`;
        }
        return 'Purchased gift subscription';
    }
    if (event.type === 'gift_redemption_event') {
        return 'started gift subscription';
    }
    if (event.type === 'gift_ended_event') {
        return 'gift subscription expired';
    }
    return undefined;
}

function getActionTitle(event: RawMemberEvent, hasMultipleNewsletters: boolean): string | undefined {
    if (event.type === 'automated_email_sent_event') {
        const auto = event.data.automatedEmail as {source?: string; subject?: string} | undefined;
        if (auto?.source === 'automation_action_revision') {
            const subject = trimString(auto.subject);
            return subject ? `received automated email: ${subject}` : 'received automated email';
        }
    }
    return getAction(event, hasMultipleNewsletters);
}

function getObject(event: RawMemberEvent): string {
    if (event.type === 'signup_event' || event.type === 'subscription_event' || event.type === 'donation_event') {
        const attribution = event.data.attribution as {title?: string} | undefined;
        if (attribution?.title) {
            return attribution.title;
        }
    }
    if (event.type === 'comment_event' || event.type === 'click_event' || event.type === 'feedback_event') {
        const post = event.data.post as {title?: string} | undefined;
        if (post?.title) {
            return post.title;
        }
    }
    return '';
}

function getSource(event: RawMemberEvent): {name: string; url: string | null} | null {
    const attribution = event.data.attribution as {referrer_source?: string; referrer_url?: string | null} | undefined;
    if (attribution?.referrer_source) {
        return {
            name: attribution.referrer_source,
            url: attribution.referrer_url ?? null
        };
    }
    return null;
}

function getInfo(event: RawMemberEvent, ctx: MemberEventContext): string | null | undefined {
    if (event.type === 'signup_event' && ctx.paidMembersEnabled) {
        const createdWith = event.data.created_with_status;
        if (createdWith && createdWith !== 'free') {
            return null;
        }
        return 'Free';
    }
    if (event.type === 'gift_redemption_event') {
        return (event.data.tier_name as string | undefined) ?? undefined;
    }
    // Ember additionally renders MRR deltas for subscription_event and money
    // amounts for donation_event using currency utils. We defer that: those
    // rows still parse and render an action, just without the info suffix.
    return undefined;
}

function getDescription(event: RawMemberEvent): string | undefined {
    if (event.type === 'click_event') {
        const link = event.data.link as {to?: string} | undefined;
        // Ember runs `cleanTrackedUrl` here to strip tracking params. We don't
        // have that util in this app yet — return the raw URL as a graceful
        // fallback rather than dropping the description entirely.
        return link?.to;
    }
    return undefined;
}

function getUrl(event: RawMemberEvent): string | undefined {
    if (event.type === 'comment_event' || event.type === 'click_event' || event.type === 'feedback_event') {
        const post = event.data.post as {url?: string} | undefined;
        if (post?.url) {
            return post.url;
        }
    }
    if (event.type === 'signup_event' || event.type === 'subscription_event' || event.type === 'donation_event') {
        const attribution = event.data.attribution as {url?: string} | undefined;
        if (attribution?.url) {
            return attribution.url;
        }
    }
    return undefined;
}

function getRoute(event: RawMemberEvent): string | undefined {
    if (event.type === 'click_event' || event.type === 'feedback_event') {
        const post = event.data.post as {id?: string} | undefined;
        if (post?.id) {
            return `#/posts/analytics/${post.id}`;
        }
    }
    if (event.type === 'signup_event' || event.type === 'subscription_event') {
        if (event.data.attribution_type === 'post' && event.data.attribution_id) {
            return `#/posts/analytics/${event.data.attribution_id as string}`;
        }
    }
    return undefined;
}

/**
 * Transform a raw member event (as returned from `GET /members/events`) into
 * the parsed shape the activity-feed row expects.
 */
export function parseMemberEvent(event: RawMemberEvent, ctx: MemberEventContext): ParsedMemberEvent {
    const trimmedName = trimString(event.data.member?.name);
    const subject = event.data.member
        ? (trimmedName || event.data.member.email || '')
        : ((event.data.name) || (event.data.email as string | undefined) || '');
    const member = event.data.member ? {...event.data.member, name: trimmedName ?? undefined} : event.data.member;

    return {
        id: event.data.id,
        memberId: (event.data.member_id ?? event.data.member?.id),
        member,
        emailId: event.data.email_id,
        email: event.data.email,
        icon: getIcon(event),
        subject,
        action: getAction(event, ctx.hasMultipleNewsletters),
        actionTitle: getActionTitle(event, ctx.hasMultipleNewsletters),
        // The dash separator Ember uses between action and object in inline layouts.
        join: '–',
        object: getObject(event),
        source: getSource(event),
        info: getInfo(event, ctx),
        description: getDescription(event),
        url: getUrl(event),
        route: getRoute(event),
        // Keep as ISO string — consumers format for display (`moment.fromNow`
        // in Ember; `date-fns` or similar in React). Not tied to a specific lib.
        timestamp: event.data.created_at
    };
}
