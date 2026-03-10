import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {MemberFilterColumnMetadata} from '../hooks/member-filter-metadata';
import moment from 'moment-timezone';

export interface MemberDynamicColumnDisplay {
    primary: string;
    secondary?: string;
    muted?: boolean;
}

function formatDateDisplay(value?: string | null): MemberDynamicColumnDisplay {
    if (!value) {
        return {
            primary: 'N/A',
            muted: true
        };
    }

    return {
        primary: moment.utc(value).format('D MMM YYYY'),
        secondary: moment.utc(value).fromNow()
    };
}

function getPrimarySubscription(member: Member) {
    return member.subscriptions?.[0];
}

function formatSubscriptionStatus(status?: string): string {
    if (!status) {
        return 'N/A';
    }

    return status.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export function getMemberDynamicColumnDisplay(member: Member, column: MemberFilterColumnMetadata): MemberDynamicColumnDisplay {
    switch (column.key) {
    case 'label':
        return {
            primary: member.labels?.map(label => label.name).join(', ') || 'None',
            muted: !member.labels?.length
        };
    case 'subscribed':
        return {
            primary: member.subscribed ? 'Subscribed' : 'Unsubscribed'
        };
    case 'subscriptions.plan_interval': {
        const interval = getPrimarySubscription(member)?.plan.interval;

        return {
            primary: interval === 'year' ? 'Yearly' : interval === 'month' ? 'Monthly' : 'N/A',
            muted: !interval
        };
    }
    case 'subscriptions.status':
        return {
            primary: formatSubscriptionStatus(getPrimarySubscription(member)?.status)
        };
    case 'email_count':
        return {
            primary: String(member.email_count ?? 0)
        };
    case 'email_opened_count':
        return {
            primary: String(member.email_opened_count ?? 0)
        };
    case 'last_seen_at':
        return formatDateDisplay(member.last_seen_at);
    case 'subscriptions.start_date':
        return formatDateDisplay(getPrimarySubscription(member)?.start_date);
    case 'subscriptions.current_period_end':
        return formatDateDisplay(getPrimarySubscription(member)?.current_period_end);
    default:
        return {
            primary: 'N/A',
            muted: true
        };
    }
}
