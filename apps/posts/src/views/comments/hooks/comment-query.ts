import {compileSurfaceQuery} from '@src/views/filters/query-compiler';

interface BuildCommentsQueryParamsInput {
    filter?: string;
}

export function buildCommentsQueryParams({filter}: BuildCommentsQueryParamsInput): Record<string, string> {
    return compileSurfaceQuery({
        surface: 'comments',
        filter
    });
}
