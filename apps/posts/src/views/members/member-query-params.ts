import {memberFields} from './member-fields';
import {resolveField} from '../filters/resolve-field';
import type {FilterPredicate} from '../filters/filter-types';

type ActiveColumn = {
    key: string;
    label: string;
    include?: string;
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

    return Array.from(columns.values());
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
        limit: '50',
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
