export default function isLocalContentImage(url: string, siteUrl: string = ''): boolean {
    const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
    const imagePath = url.replace(normalizedSiteUrl, '');
    return /^(\/.*|__GHOST_URL__)\/?content\/images\//.test(imagePath);
}
