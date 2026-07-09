interface BuildMembersUrlOptions {
    filter?: string;
}

// Local copy of the members domain's buildMembersUrl. The members domain moved
// to apps/admin ahead of post-analytics; this keeps post-analytics self-contained
// until it moves too, at which point both collapse onto the members location.
export function buildMembersUrl({filter}: BuildMembersUrlOptions = {}): string {
    const searchParams = new URLSearchParams();

    if (filter) {
        searchParams.set('filter', filter);
    }

    const search = searchParams.toString();

    return search ? `/members?${search}` : '/members';
}
