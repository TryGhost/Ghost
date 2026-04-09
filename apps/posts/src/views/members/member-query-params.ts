import moment from 'moment-timezone';
import {SUBSCRIPTION_STATUS_OPTIONS, memberFields} from './member-fields';
import {resolveField} from '../filters/resolve-field';
import type {FilterPredicate} from '../filters/filter-types';
import type {Member, MemberSubscription} from '@tryghost/admin-x-framework/api/members';

const MAX_ACTIVE_COLUMNS = 2;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'unpaid', 'past_due']);

const SUBSCRIPTION_STATUS_LABELS = new Map(
    SUBSCRIPTION_STATUS_OPTIONS.map(option => [option.value, option.label])
);

const SUBSCRIPTION_STATUS_ORDER: Record<string, number> = {
    active: 0,
    trialing: 1,
    past_due: 2,
    unpaid: 3,
    canceled: 4,
    incomplete: 5,
    incomplete_expired: 6
};

export type ActiveColumn = {
    key: string;
    label: string;
    include?: string;
};

export type ColumnValue = {
    text: string;
    subtext?: string;
};

interface BuildMemberListSearchParamsOptions {
    filters: FilterPredicate[];
    nql?: string;
    search: string;
}

interface BuildMemberOperationParamsOptions {
    nql?: string;
    search: string;
}

export function getMemberActiveColumns(filters: FilterPredicate[]): ActiveColumn[] {
    const columns = new Map<string, ActiveColumn>();

    for (const filter of filters) {
        const activeColumn = resolveField(memberFields, filter.field, 'UTC')?.definition.metadata?.activeColumn;

        if (activeColumn) {
            columns.set(activeColumn.key, activeColumn);
        }
    }

    return Array.from(columns.values()).slice(0, MAX_ACTIVE_COLUMNS);
}

function getMemberIncludes(filters: FilterPredicate[]): string {
    const includes = new Set(['labels', 'tiers']);

    for (const column of getMemberActiveColumns(filters)) {
        if (column.include) {
            includes.add(column.include);
        }
    }

    return Array.from(includes).join(',');
}

export function buildMemberListSearchParams({filters, nql, search}: BuildMemberListSearchParamsOptions): Record<string, string> | undefined {
    if (!nql && !search) {
        return undefined;
    }

    const params: Record<string, string> = {
        include: getMemberIncludes(filters),
        limit: '100',
        order: 'created_at desc'
    };

    if (nql) {
        params.filter = nql;
    }

    if (search) {
        params.search = search;
    }

    return params;
}

export function buildMemberOperationParams({nql, search}: BuildMemberOperationParamsOptions): {all?: true; filter?: string; search?: string} {
    if (!nql && !search) {
        return {all: true};
    }

    return {
        ...(nql ? {filter: nql} : {}),
        ...(search ? {search} : {})
    };
}

export function mostRelevantSubscription(
    subscriptions: MemberSubscription[] | undefined
): MemberSubscription | null {
    if (!subscriptions?.length) {
        return null;
    }

    const withId = subscriptions.filter(s => s.id);

    if (!withId.length) {
        return null;
    }

    const sorted = [...withId].sort((a, b) => {
        const aActive = ACTIVE_SUBSCRIPTION_STATUSES.has(a.status);
        const bActive = ACTIVE_SUBSCRIPTION_STATUSES.has(b.status);

        if (aActive && !bActive) {
            return -1;
        }
        if (!aActive && bActive) {
            return 1;
        }

        const aEnd = new Date(a.current_period_end).getTime();
        const bEnd = new Date(b.current_period_end).getTime();

        if (Number.isNaN(aEnd) && Number.isNaN(bEnd)) {
            return 0;
        }
        if (Number.isNaN(aEnd)) {
            return 1;
        }
        if (Number.isNaN(bEnd)) {
            return -1;
        }

        return bEnd - aEnd;
    });

    return sorted[0];
}

function formatDateColumn(date: string | undefined, timezone: string): ColumnValue | null {
    if (!date) {
        return null;
    }
    return {
        text: moment.tz(date, timezone).format('D MMM YYYY'),
        subtext: moment(date).fromNow()
    };
}

export function getActiveColumnValue(
    column: ActiveColumn,
    member: Member,
    timezone: string
): ColumnValue | null {
    switch (column.key) {
    case 'labels':
        return member.labels?.length
            ? {text: member.labels.map(l => l.name).join(', ')}
            : null;

    case 'tiers':
        return member.tiers?.length
            ? {text: member.tiers.map(t => t.name).join(', ')}
            : null;

    case 'subscriptions.plan_interval': {
        const interval = mostRelevantSubscription(member.subscriptions)?.plan?.interval;
        if (!interval) {
            return null;
        }
        return {text: interval === 'month' ? 'Monthly' : 'Yearly'};
    }

    case 'subscriptions.status': {
        if (!member.subscriptions?.length) {
            return null;
        }
        const statuses = [...new Set(
            member.subscriptions
                .filter(s => s.id)
                .map(s => s.status)
        )].sort((a, b) => (SUBSCRIPTION_STATUS_ORDER[a] ?? 99) - (SUBSCRIPTION_STATUS_ORDER[b] ?? 99));
        if (!statuses.length) {
            return null;
        }
        return {
            text: statuses
                .map(s => SUBSCRIPTION_STATUS_LABELS.get(s) ?? s.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '))
                .join(', ')
        };
    }

    case 'subscriptions.start_date':
        return formatDateColumn(
            mostRelevantSubscription(member.subscriptions)?.start_date,
            timezone
        );

    case 'subscriptions.current_period_end':
        return formatDateColumn(
            mostRelevantSubscription(member.subscriptions)?.current_period_end,
            timezone
        );

    case 'offer_redemptions': {
        const offers = member.subscriptions
            ?.map(s => s.offer?.name)
            .filter(Boolean);
        return offers?.length
            ? {text: offers.join(', ')}
            : null;
    }

    default:
        return null;
    }
}
