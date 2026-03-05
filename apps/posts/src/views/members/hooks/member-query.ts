import {compileSurfaceQuery} from '@src/views/filters/query-compiler';

interface BuildMembersQueryParamsInput {
    filter?: string;
    search?: string;
}

export function buildMembersQueryParams({filter, search}: BuildMembersQueryParamsInput): Record<string, string> | undefined {
    const compiledQuery = compileSurfaceQuery({
        surface: 'members',
        filter,
        search
    });

    if (!compiledQuery.filter && !compiledQuery.search) {
        return undefined;
    }

    return {
        include: 'labels,tiers',
        limit: '50',
        order: 'created_at desc',
        ...compiledQuery
    };
}
