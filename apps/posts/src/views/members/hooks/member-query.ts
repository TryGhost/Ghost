import {compileSurfaceQuery} from '@src/views/filters/query-compiler';
import {deriveMemberFilterMetadata} from './member-filter-metadata';
import type {Filter} from '@tryghost/shade';

interface BuildMembersQueryParamsInput {
    filter?: string;
    search?: string;
    filters?: Filter[];
}

export function buildMembersQueryParams({filter, search, filters = []}: BuildMembersQueryParamsInput): Record<string, string> | undefined {
    const compiledQuery = compileSurfaceQuery({
        surface: 'members',
        filter,
        search
    });
    const metadata = deriveMemberFilterMetadata(filters);
    const include = ['labels', 'tiers', ...metadata.requiredIncludes].join(',');

    if (!compiledQuery.filter && !compiledQuery.search) {
        return undefined;
    }

    return {
        include,
        limit: '50',
        order: 'created_at desc',
        ...compiledQuery
    };
}
