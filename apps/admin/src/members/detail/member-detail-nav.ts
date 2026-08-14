/**
 * Works out where the member-detail "back" control should navigate to, mirroring
 * the Ember member controller's `membersListPath`:
 *   1. a `back` param that points at the members area (so list filters/scroll are
 *      preserved) wins;
 *   2. otherwise a `post` param scopes the return link to that post's members list;
 *   3. otherwise fall back to the bare members list.
 *
 * The `startsWith('/members')` guard keeps navigation same-origin/internal and
 * rejects absolute or protocol-relative URLs, so a crafted `back` value can't turn
 * this into an open redirect.
 *
 * @param search - the location search string (e.g. `?back=%2Fmembers%3Ffilter...`)
 */
export function deriveMemberDetailBackPath(search: string): string {
    const params = new URLSearchParams(search);

    const back = params.get('back');
    if (back && back.startsWith('/members')) {
        return back;
    }

    const post = params.get('post');
    if (post) {
        return `/members?post=${encodeURIComponent(post)}`;
    }

    return '/members';
}
