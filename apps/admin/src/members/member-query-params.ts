import moment from 'moment-timezone';
import {type ActiveColumn, type FilterPredicate, resolveField} from '@/shared/filters';
import {memberFields} from './member-fields';
import type {Member} from '@tryghost/admin-x-framework/api/members';

const MAX_ACTIVE_COLUMNS = 2;

export type {ActiveColumn};

export type ColumnValue = {
    text: string;
    subtext?: string;
};

type ColumnValueReader = (member: Member, timezone: string) => ColumnValue | null;

/**
 * A column the member list appends, carrying how to read one member's value for it.
 *
 * The reader is attached where the column is built, which is where everything it needs is
 * already in hand. A cell asks the column rather than working back from its key to the
 * field behind it.
 */
export interface MemberActiveColumn extends ActiveColumn {
    getValue: ColumnValueReader;
}

interface BuildMemberListSearchParamsOptions {
    filters: FilterPredicate[];
    nql?: string;
    search: string;
}

interface BuildMemberOperationParamsOptions {
    nql?: string;
    search: string;
}

export function getMemberActiveColumns(filters: FilterPredicate[]): MemberActiveColumn[] {
    const columns = new Map<string, MemberActiveColumn>();

    for (const filter of filters) {
        const resolved = resolveField(memberFields, filter.field, 'UTC');
        const activeColumn = resolved?.definition.metadata?.activeColumn;

        if (!activeColumn) {
            continue;
        }

        const getValue = fixedColumnValues[activeColumn.key];

        if (getValue) {
            columns.set(activeColumn.key, {...activeColumn, getValue});
        }
    }

    return Array.from(columns.values()).slice(0, MAX_ACTIVE_COLUMNS);
}

/**
 * What the list asks the API for, given the filters applied.
 *
 * Read off the filtered fields themselves rather than off the columns they resolve to.
 * Whether a value is needed follows from the filter, so it is known on the first render;
 * whether a column can be named can wait on data still in flight, and a column can be
 * dropped by the display budget while its values are still wanted.
 */
function getMemberIncludes(filters: FilterPredicate[]): string {
    const includes = new Set(['labels', 'tiers']);

    for (const filter of filters) {
        const columnInclude = resolveField(memberFields, filter.field, 'UTC')?.definition.metadata?.columnInclude;

        if (columnInclude) {
            includes.add(columnInclude);
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

function formatDateColumn(date: string | undefined, timezone: string): ColumnValue | null {
    if (!date) {
        return null;
    }
    return {
        text: moment.tz(date, timezone).format('D MMM YYYY'),
        subtext: moment(date).fromNow()
    };
}

/**
 * How each fixed column reads a member, filed under the column its field declares. A field
 * names a column and this names the same column's value, so the two are found the same way
 * instead of one being declared and the other matched by hand.
 */
const fixedColumnValues: Record<string, ColumnValueReader | undefined> = {
    labels: member => (member.labels?.length
        ? {text: member.labels.map(l => l.name).join(', ')}
        : null),

    tiers: member => (member.tiers?.length
        ? {text: member.tiers.map(t => t.name).join(', ')}
        : null),

    'subscriptions.plan_interval': (member) => {
        const interval = member.current_subscription?.plan?.interval;
        if (!interval) {
            return null;
        }
        return {text: interval === 'month' ? 'Monthly' : 'Yearly'};
    },

    'subscriptions.status': (member) => {
        const status = member.current_subscription?.status;
        if (!status) {
            return null;
        }
        return {
            text: status
                .split('_')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ')
        };
    },

    'subscriptions.start_date': (member, timezone) => formatDateColumn(
        member.current_subscription?.start_date,
        timezone
    ),

    'subscriptions.current_period_end': (member, timezone) => formatDateColumn(
        member.current_subscription?.current_period_end,
        timezone
    ),

    offer_redemptions: (member) => {
        const offers = member.subscriptions
            ?.map(s => s.offer?.name)
            .filter(Boolean);
        return offers?.length
            ? {text: offers.join(', ')}
            : null;
    }
};
