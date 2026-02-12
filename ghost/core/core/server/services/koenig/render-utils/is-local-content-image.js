const isLocalContentImage = function (url, siteUrl = '') {
    if (url.includes('storage.ghost.is')) {
        return true;
    }
    const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
    const imagePath = url.replace(normalizedSiteUrl, '');
    return /^(\/.*|__GHOST_URL__)\/?content\/images\//.test(imagePath);
};

module.exports = {
    isLocalContentImage
};
