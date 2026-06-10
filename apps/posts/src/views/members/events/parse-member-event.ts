import {formatNumber} from '@tryghost/shade/utils';
import {getSymbol} from '@tryghost/admin-x-framework';
import type {MemberEvent, MemberEventData} from '@tryghost/admin-x-framework/api/members';

/**
 * Port of the Ember `parse-member-event` helper. Turns a raw member event
 * from the events endpoint into display data (icon key, action text, info,
 * linkable object, etc.).
 */

export interface ParseEventContext {
    hasMultipleNewsletters: boolean;
    /** membersUtils.hasMultipleTiers: paid members enabled and more than one paid tier */
    hasMultipleTiers: boolean;
    /** settings.paid_members_enabled */
    paidMembersEnabled: boolean;
}

export interface ParsedMemberEvent {
    memberId?: string;
    member: MemberEventData['member'];
    emailId?: string;
    email?: unknown;
    icon: string;
    subject: string;
    action: string;
    join: string;
    object: string;
    source: {name: string; url: string | null} | null;
    info: string | null;
    description: string | null;
    url: string | null;
    route: string | null;
    timestamp: string;
}

function getNonDecimal(amount: number): number {
    return amount / 100;
}

function trimString(value: unknown): string | null {
    // Always convert to null if the value is empty/null/undefined
    if (!value && value !== 0) {
        return null;
    }

    const trimmed = String(value).trim();

    return trimmed || null;
}

function pluralizeLinks(count: number): string {
    return `${formatNumber(count)} ${count === 1 ? 'link' : 'links'}`;
}

function getIcon(event: MemberEvent): string {
    let icon = '';

    if (event.type === 'login_event') {
        icon = 'logged-in';
    }

    if (event.type === 'payment_event') {
        icon = 'subscriptions';
    }

    if (event.type === 'newsletter_event') {
        if (event.data.subscribed) {
            icon = 'subscribed-to-email';
        } else {
            icon = 'unsubscribed-from-email';
        }
    }

    if (event.type === 'subscription_event') {
        icon = 'subscriptions';

        if (event.data.type === 'canceled') {
            icon = 'canceled-subscription';
        }
    }

    if (event.type === 'signup_event' || (event.type === 'subscription_event' && event.data.type === 'created' && event.data.signup)) {
        icon = 'signed-up';
    }

    if (event.type === 'email_opened_event') {
        icon = 'opened-email';
    }

    if (event.type === 'email_sent_event') {
        icon = 'sent-email';
    }

    if (event.type === 'automated_email_sent_event') {
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
        if (event.data.score === 1) {
            icon = 'more-like-this';
        } else {
            icon = 'less-like-this';
        }
    }

    if (event.type === 'donation_event') {
        icon = 'subscriptions';
    }

    if (event.type === 'gift_purchase_event') {
        icon = 'gift';
    }

    if (event.type === 'gift_redemption_event') {
        icon = 'gift';
    }

    if (event.type === 'gift_ended_event') {
        icon = 'gift';
    }

    if (event.type === 'email_change_event') {
        icon = 'email-changed';
    }

    return 'event-' + icon;
}

function getAction(event: MemberEvent, context: ParseEventContext): string {
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
        let newsletter = 'newsletter';
        if (context.hasMultipleNewsletters && event.data.newsletter && event.data.newsletter.name) {
            newsletter = event.data.newsletter.name;
        }

        if (event.data.subscribed) {
            return 'subscribed to ' + newsletter;
        } else {
            return 'unsubscribed from ' + newsletter;
        }
    }

    if (event.type === 'subscription_event') {
        if (event.data.type === 'created') {
            return 'started paid subscription';
        }
        if (event.data.type === 'updated') {
            return 'changed paid subscription';
        }
        if (event.data.type === 'canceled') {
            return 'canceled paid subscription';
        }
        if (event.data.type === 'reactivated') {
            return 'reactivated paid subscription';
        }
        if (event.data.type === 'expired') {
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
        const slug = event.data.automatedEmail?.slug || '';
        const emailType = slug.includes('paid') ? 'Paid' : 'Free';
        return `received welcome email (${emailType})`;
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
        if (event.data.parent) {
            return 'replied to comment';
        }
        return 'commented';
    }

    if (event.type === 'click_event') {
        return 'clicked link in email';
    }

    if (event.type === 'aggregated_click_event') {
        const clicks = event.data.count?.clicks ?? 0;
        if (clicks <= 1) {
            return 'clicked link in email';
        }
        return `clicked ${pluralizeLinks(clicks)} in email`;
    }

    if (event.type === 'feedback_event') {
        if (event.data.score === 1) {
            return 'more like this';
        }
        return 'less like this';
    }

    if (event.type === 'email_change_event') {
        if (event.data.from_email && event.data.to_email) {
            return `Email address changed from ${event.data.from_email} to ${event.data.to_email}`;
        }
        return 'Email address changed';
    }

    if (event.type === 'donation_event') {
        return 'Made a one-time payment';
    }

    if (event.type === 'gift_purchase_event') {
        const symbol = getSymbol(event.data.currency ?? '');
        const formattedAmount = symbol + getNonDecimal(event.data.amount ?? 0);
        const tierName = event.data.tier_name;
        const duration = event.data.duration;
        const cadenceLabel = duration === 1 ? event.data.cadence : event.data.cadence + 's';

        return `Purchased gift subscription for ${formattedAmount} (${tierName}, ${duration} ${cadenceLabel})`;
    }

    if (event.type === 'gift_redemption_event') {
        return 'started gift subscription';
    }

    if (event.type === 'gift_ended_event') {
        return 'gift subscription expired';
    }

    return '';
}

/**
 * When the action and object are appended into one sentence we join them with
 * a dash (see the Ember helper's getJoin for details).
 */
function getJoin(): string {
    return '–';
}

/** Clickable object, shown between action and info, or in a separate column in some views */
function getObject(event: MemberEvent): string {
    if (event.type === 'signup_event' || event.type === 'subscription_event' || event.type === 'donation_event') {
        if (event.data.attribution?.title) {
            return event.data.attribution.title;
        }
    }

    if (event.type === 'comment_event') {
        if (event.data.post?.title) {
            return event.data.post.title;
        }
    }

    if (event.type === 'click_event' || event.type === 'feedback_event') {
        if (event.data.post?.title) {
            return event.data.post.title;
        }
    }

    return '';
}

function getSource(event: MemberEvent): {name: string; url: string | null} | null {
    if (event.data?.attribution?.referrer_source) {
        return {
            name: event.data.attribution.referrer_source,
            url: event.data.attribution.referrer_url ?? null
        };
    }

    return null;
}

function getInfo(event: MemberEvent, context: ParseEventContext): string | null {
    if (event.type === 'subscription_event') {
        const mrrDelta = getNonDecimal(event.data.mrr_delta ?? 0);
        if (mrrDelta === 0) {
            return null;
        }
        const symbol = getSymbol(event.data.currency ?? '');

        if (event.data.type === 'created') {
            const sign = mrrDelta > 0 ? '' : '-';
            const tierName = context.hasMultipleTiers ? (event.data.tierName ?? 'Paid') : 'Paid';
            return `${tierName} ${sign}${symbol}${Math.abs(mrrDelta)}/month`;
        }
        const sign = mrrDelta > 0 ? '+' : '-';
        return `MRR ${sign}${symbol}${Math.abs(mrrDelta)}`;
    }

    if (event.type === 'signup_event' && context.paidMembersEnabled) {
        if (event.data.created_with_status && event.data.created_with_status !== 'free') {
            return null;
        }
        return 'Free';
    }

    if (event.type === 'donation_event') {
        const symbol = getSymbol(event.data.currency ?? '');
        return symbol + getNonDecimal(event.data.amount ?? 0);
    }

    if (event.type === 'gift_redemption_event') {
        return event.data.tier_name ?? null;
    }

    return null;
}

/**
 * Removes Ghost's own tracking parameters from a clicked link and strips the
 * protocol/leading www for display (port of utils.cleanTrackedUrl).
 */
export function cleanTrackedUrl(url: string, display = false): string {
    const removeParams = ['ref', 'attribution_id', 'attribution_type'];
    const urlObj = new URL(url);
    for (const param of removeParams) {
        urlObj.searchParams.delete(param);
    }
    if (!display) {
        return urlObj.toString();
    }
    const urlWithoutProtocol = urlObj.host
        + (urlObj.pathname === '/' && !urlObj.search ? '' : urlObj.pathname)
        + (urlObj.search ? urlObj.search : '')
        + (urlObj.hash ? urlObj.hash : '');
    return urlWithoutProtocol.replace(/^www\./, '');
}

function getDescription(event: MemberEvent): string | null {
    if (event.type === 'click_event') {
        const to = event.data.link?.to;
        if (!to) {
            return null;
        }
        try {
            return cleanTrackedUrl(to, true);
        } catch {
            // Invalid URL
        }
        return to;
    }
    return null;
}

/** Make the object clickable (external URL) */
function getURL(event: MemberEvent): string | null {
    if (['comment_event', 'click_event', 'feedback_event'].includes(event.type)) {
        if (event.data.post?.url) {
            return event.data.post.url;
        }
    }

    if (['signup_event', 'subscription_event', 'donation_event'].includes(event.type)) {
        if (event.data.attribution && event.data.attribution.url) {
            return event.data.attribution.url;
        }
    }
    return null;
}

/** Internal route path for a clickable object */
function getRoute(event: MemberEvent): string | null {
    if (['click_event', 'feedback_event'].includes(event.type)) {
        if (event.data.post?.id) {
            return `/posts/analytics/${event.data.post.id}`;
        }
    }

    if (['signup_event', 'subscription_event'].includes(event.type)) {
        if (event.data.attribution_type === 'post' && event.data.attribution_id) {
            return `/posts/analytics/${event.data.attribution_id}`;
        }
    }
    return null;
}

export function parseMemberEvent(event: MemberEvent, context: ParseEventContext): ParsedMemberEvent {
    const memberName = trimString(event.data.member?.name);

    const subject = event.data.member
        ? (memberName || event.data.member.email || '')
        : (event.data.name || (typeof event.data.email === 'string' ? event.data.email : '') || '');

    // Ensure the member object carries the trimmed name
    const member = event.data.member ? {
        ...event.data.member,
        name: memberName
    } : event.data.member;

    return {
        memberId: event.data.member_id ?? event.data.member?.id,
        member,
        emailId: event.data.email_id,
        email: event.data.email,
        icon: getIcon(event),
        subject,
        action: getAction(event, context),
        join: getJoin(),
        object: getObject(event),
        source: getSource(event),
        info: getInfo(event, context),
        description: getDescription(event),
        url: getURL(event),
        route: getRoute(event),
        timestamp: event.data.created_at
    };
}

export function capitalizeFirstLetter(value: string): string {
    if (!value) {
        return value;
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
}
