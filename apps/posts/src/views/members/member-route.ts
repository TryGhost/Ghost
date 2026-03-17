interface BuildMembersUrlOptions {
    filter?: string;
    query?: Record<string, string | null | undefined>;
}

export function buildMembersUrl({filter, query}: BuildMembersUrlOptions = {}): string {
    const searchParams = new URLSearchParams();

    if (filter) {
        searchParams.set('filter', filter);
    }

    for (const [key, value] of Object.entries(query ?? {})) {
        if (value !== null && value !== undefined) {
            searchParams.set(key, value);
        }
    }

    const search = searchParams.toString();

    return search ? `/members?${search}` : '/members';
}
