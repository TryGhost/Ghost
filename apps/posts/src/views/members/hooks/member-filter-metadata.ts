import type {MemberPredicate} from '@src/views/filters/member-fields';

export interface MemberFilterColumnMetadata {
    key: string;
    label: string;
    include?: 'labels' | 'subscriptions';
}

export interface MemberFilterMetadata {
    activeFields: string[];
    activeColumns: MemberFilterColumnMetadata[];
    requiredIncludes: string[];
}

const MEMBER_FILTER_COLUMN_MAP: Record<string, MemberFilterColumnMetadata | undefined> = {
    label: {
        key: 'label',
        label: 'Label',
        include: 'labels'
    },
    subscribed: {
        key: 'subscribed',
        label: 'Subscribed'
    },
    'subscriptions.plan_interval': {
        key: 'subscriptions.plan_interval',
        label: 'Billing period',
        include: 'subscriptions'
    },
    'subscriptions.status': {
        key: 'subscriptions.status',
        label: 'Stripe subscription status',
        include: 'subscriptions'
    },
    email_count: {
        key: 'email_count',
        label: 'Emails sent'
    },
    email_opened_count: {
        key: 'email_opened_count',
        label: 'Emails opened'
    },
    last_seen_at: {
        key: 'last_seen_at',
        label: 'Last seen'
    },
    'subscriptions.start_date': {
        key: 'subscriptions.start_date',
        label: 'Paid start date',
        include: 'subscriptions'
    },
    'subscriptions.current_period_end': {
        key: 'subscriptions.current_period_end',
        label: 'Next billing date',
        include: 'subscriptions'
    }
};

export function deriveMemberFilterMetadata(filters: MemberPredicate[]): MemberFilterMetadata {
    const activeFields = [...new Set(filters.map(filter => filter.field))];
    const activeColumns = activeFields
        .map(field => MEMBER_FILTER_COLUMN_MAP[field])
        .filter((column): column is MemberFilterColumnMetadata => Boolean(column));
    const requiredIncludes = [...new Set(activeColumns.flatMap(column => column.include ? [column.include] : []))];

    return {
        activeFields,
        activeColumns,
        requiredIncludes
    };
}
