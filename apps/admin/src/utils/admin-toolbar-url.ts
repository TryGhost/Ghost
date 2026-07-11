export function getAdminToolbarUrl(url?: string) {
    if (!url) {
        return undefined;
    }

    try {
        const siteUrl = new URL(url);
        siteUrl.searchParams.set('admin', '1');
        return siteUrl.href;
    } catch {
        return url;
    }
}
