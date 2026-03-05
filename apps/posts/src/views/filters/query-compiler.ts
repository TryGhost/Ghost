export type FilterSurface = 'members' | 'comments';

export interface CompileSurfaceQueryInput {
    surface: FilterSurface;
    filter?: string;
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

export function compileSurfaceQuery(input: CompileSurfaceQueryInput): SurfaceQuery {
    const filter = normalizeQueryValue(input.filter);
    const search = normalizeQueryValue(input.search);

    if (input.surface === 'members') {
        return {
            ...(filter ? {filter} : {}),
            ...(search ? {search} : {})
        };
    }

    return filter ? {filter} : {};
}
