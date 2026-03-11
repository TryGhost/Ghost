import {compileSurfaceQuery} from '@src/views/filters/query-compiler';

interface BuildCommentsQueryParamsInput {
    filter?: string;
}

export function buildCommentsQueryParams({filter}: BuildCommentsQueryParamsInput): Record<string, string> {
    const query = compileSurfaceQuery({
        surface: 'comments',
        filter
    });

    return query.filter ? {filter: query.filter} : {};
}
