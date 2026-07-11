export function adminHref(adminUrl, path) {
    const cleanPath = path.replace(/^\/+/, '');
    return `${adminUrl}#/${cleanPath}`;
}

export function commentsHref(adminUrl, postId) {
    return adminHref(adminUrl, `comments?filter=${encodeURIComponent(`post_id:${postId}`)}`);
}

export function hideToolbarHref() {
    const url = new URL(window.location.href);
    url.searchParams.set('admin', '0');
    return `${url.pathname}${url.search}${url.hash}`;
}
