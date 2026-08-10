export function buildMemberDetailPath(memberId: string, backPath?: string) {
    const params = new URLSearchParams();

    if (backPath) {
        params.set('back', backPath);
    }

    const queryString = params.toString();

    return `/members/${memberId}${queryString ? `?${queryString}` : ''}`;
}
