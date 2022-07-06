import moment from 'moment';
import {getNonDecimal, getSymbol} from 'ghost-admin/utils/currency';

export default function parseMemberEvent(event, hasMultipleNewsletters) {
    let subject = event.data.member.name || event.data.member.email;
    let icon = getIcon(event);
    let action = getAction(event);
    let object = getObject(event, hasMultipleNewsletters);
    let info = getInfo(event);
    let timestamp = moment(event.data.created_at);

    return {
        memberId: event.data.member_id,
        member: event.data.member,
        emailId: event.data.email_id,
        email: event.data.email,
        icon,
        subject,
        action,
        object,
        info,
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

    return 'event-' + icon;
}

function getAction(event) {
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
        if (event.data.subscribed) {
            return 'subscribed to';
        } else {
            return 'unsubscribed from';
        }
    }

    if (event.type === 'subscription_event') {
        if (event.data.type === 'created') {
            return 'started';
        }
        if (event.data.type === 'updated') {
            return 'changed';
        }
        if (event.data.type === 'canceled') {
            return 'canceled';
        }
        if (event.data.type === 'reactivated') {
            return 'reactivated';
        }
        if (event.data.type === 'expired') {
            return 'ended';
        }

        return 'changed';
    }

    if (event.type === 'email_opened_event') {
        return 'opened';
    }

    if (event.type === 'email_delivered_event') {
        return 'received';
    }

    if (event.type === 'email_failed_event') {
        return 'failed to receive';
    }
}

function getObject(event, hasMultipleNewsletters) {
    if (event.type === 'newsletter_event') {
        if (hasMultipleNewsletters && event.data.newsletter && event.data.newsletter.name) {
            return 'newsletter – ' + event.data.newsletter.name;
        }
        return 'newsletter';
    }

    if (event.type === 'subscription_event') {
        return 'their subscription';
    }

    if (event.type.match?.(/^email_/)) {
        return 'an email';
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
