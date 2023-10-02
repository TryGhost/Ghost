export function trimSearch(url: URL) {
    url.search = '';
    return url;
}

export function trimHash(url: URL) {
    url.hash = '';
    return url;
}

export function trimSearchAndHash(url: URL) {
    url.search = '';
    url.hash = '';
    return url;
}

/*  Compare two URLs based on their hostname and pathname.
 *  Query params, hash fragements, protocol and www are ignored.
 *
 *  Example:
 *  - https://a.com, http://a.com, https://www.a.com, https://a.com?param1=value, https://a.com/#segment-1 are all considered equal
 *  - but, https://a.com/path-1 and  https://a.com/path-2 are not
 */
export function arePathsEqual(urlStr1: string, urlStr2: string) {
    let url1, url2;

    try {
        url1 = new URL(urlStr1);
        url2 = new URL(urlStr2);
    } catch (e) {
        return false;
    }

    return (
        url1.hostname.replace('www.', '') === url2.hostname.replace('www.', '') &&
        url1.pathname === url2.pathname
    );
}
