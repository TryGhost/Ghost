export function isInternalUrl(url, siteUrl) {
    if (!url || !siteUrl) {
        return false;
    }

    try {
        const urlObj = new URL(url);
        const subdir = `/${new URL(siteUrl).pathname.split('/')[1]}`;
        return urlObj.hostname === new URL(siteUrl).hostname
            && urlObj.pathname.startsWith(subdir);
    } catch (e) {
        return false;
    }
}
