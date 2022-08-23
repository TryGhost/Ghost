import moment from 'moment';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';

export default function parseMemberEvent(event, hasMultipleNewsletters) {
    let subject = event.data.member.name || event.data.member.email;
    let icon = getIcon(event);
    let action = getAction(event, hasMultipleNewsletters);
    let info = getInfo(event);

    let object = getObject(event);
    const url = getURL(event);
    let timestamp = moment(event.data.created_at);

    return {
        memberId: event.data.member_id ?? event.data.member?.id,
        member: event.data.member,
        emailId: event.data.email_id,
        email: event.data.email,
        icon,
        subject,
        action,
        object,
        info,
        url,
        timestamp
    };
}

/* internal helper functions */

function getIcon(event) {
    let icon;

    if (event.type === 'signup_event') {
        icon = 'signed-up';
    }

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

    if (event.type === 'email_opened_event') {
        icon = 'opened-email';
    }

    if (event.type === 'email_delivered_event') {
        icon = 'received-email';
    }

    if (event.type === 'email_failed_event') {
        icon = 'email-delivery-failed';
    }

    if (event.type === 'comment_event') {
        icon = 'comment';
    }

    return 'event-' + icon;
}

function getAction(event, hasMultipleNewsletters) {
    if (event.type === 'signup_event') {
        return 'signed up';
    }

    if (event.type === 'login_event') {
        return 'logged in';
    }

    if (event.type === 'payment_event') {
        return 'made a payment';
    }

    if (event.type === 'newsletter_event') {
        let newsletter = 'newsletter';
        if (hasMultipleNewsletters && event.data.newsletter && event.data.newsletter.name) {
            newsletter = 'newsletter – ' + event.data.newsletter.name;
        }

        if (event.data.subscribed) {
            return 'subscribed to ' + newsletter;
        } else {
            return 'unsubscribed from ' + newsletter;
        }
    }

    if (event.type === 'subscription_event') {
        if (event.data.type === 'created') {
            return 'started their subscription';
        }
        if (event.data.type === 'updated') {
            return 'changed their subscription';
        }
        if (event.data.type === 'canceled') {
            return 'canceled their subscription';
        }
        if (event.data.type === 'reactivated') {
            return 'reactivated their subscription';
        }
        if (event.data.type === 'expired') {
            return 'ended their subscription';
        }

        return 'changed their subscription';
    }

    if (event.type === 'email_opened_event') {
        return 'opened an email';
    }

    if (event.type === 'email_delivered_event') {
        return 'received an email';
    }

    if (event.type === 'email_failed_event') {
        return 'failed to receive an email';
    }

    if (event.type === 'comment_event') {
        if (event.data.parent) {
            return 'replied to a comment on';
        }
        return 'commented on';
    }
}

/**
 * Clickable object, shown between action and info, or in a separate column in some views
 */
function getObject(event) {
    if (event.type === 'signup_event' || event.type === 'subscription_event') {
        if (event.data.attribution?.title) {
            // Add 'Attributed to ' for now, until this is incorporated in the design
            return event.data.attribution.title;
        }
    }

    if (event.type === 'comment_event') {
        if (event.data.post) {
            return event.data.post.title;
        }
    }

    return '';
}

function getInfo(event) {
    if (event.type === 'subscription_event') {
        let mrrDelta = getNonDecimal(event.data.mrr_delta, event.data.currency);
        if (mrrDelta === 0) {
            return;
        }
        let sign = mrrDelta > 0 ? '+' : '-';
        let symbol = getSymbol(event.data.currency);
        return `(MRR ${sign}${symbol}${Math.abs(mrrDelta)})`;
    }
    return;
}

/**
 * Make the object clickable
 */
function getURL(event) {
    if (event.type === 'comment_event') {
        if (event.data.post) {
            return event.data.post.url;
        }
    }

    if (event.type === 'signup_event' || event.type === 'subscription_event') {
        if (event.data.attribution && event.data.attribution.url) {
            return event.data.attribution.url;
        }
    }
    return;
}
