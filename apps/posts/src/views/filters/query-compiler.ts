import {canonicalizeFilter} from './canonical-filter';

export type FilterSurface = 'members' | 'comments';

export interface CompileSurfaceQueryInput {
    surface: FilterSurface;
    filter?: string;
    filterClauses?: string[];
    search?: string;
}

export interface SurfaceQuery {
    filter?: string;
    search?: string;
}

function normalizeQueryValue(value?: string): string | undefined {
    if (!value) {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeFilterQuery(input: CompileSurfaceQueryInput): string | undefined {
    if (input.filterClauses) {
        return canonicalizeFilter(input.filterClauses);
    }

    const normalizedFilter = normalizeQueryValue(input.filter);

    if (!normalizedFilter) {
        return undefined;
    }

    return normalizedFilter;
}

export function compileSurfaceQuery(input: CompileSurfaceQueryInput): SurfaceQuery {
    const filter = normalizeFilterQuery(input);
    const search = normalizeQueryValue(input.search);

    if (input.surface === 'members') {
        return {
            ...(filter ? {filter} : {}),
            ...(search ? {search} : {})
        };
    }

    return filter ? {filter} : {};
}
