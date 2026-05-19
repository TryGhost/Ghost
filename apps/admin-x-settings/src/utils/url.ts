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
