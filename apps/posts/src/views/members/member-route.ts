interface BuildMembersUrlOptions {
    filter?: string;
}

export function buildMembersUrl({filter}: BuildMembersUrlOptions = {}): string {
    const searchParams = new URLSearchParams();

    if (filter) {
        searchParams.set('filter', filter);
    }

    const search = searchParams.toString();

    return search ? `/members?${search}` : '/members';
}

export function buildMembersForwardDetailUrl(memberId?: string): string {
    return memberId
        ? `/members-forward/${encodeURIComponent(memberId)}`
        : '/members-forward/detail';
}
