const isLocalContentImage = function (url, siteUrl = '') {
    const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
    const imagePath = url.replace(normalizedSiteUrl, '');
    return /^(\/.*|__GHOST_URL__)\/?content\/images\//.test(imagePath);
};

const isContentImage = function (url, siteUrl = '', imageBaseUrl = '') {
    if (isLocalContentImage(url, siteUrl)) {
        return true;
    }
    if (imageBaseUrl) {
        const normalizedBaseUrl = imageBaseUrl.replace(/\/$/, '');
        const imagePath = url.replace(normalizedBaseUrl, '');
        return /^\/?content\/images\//.test(imagePath);
    }
    return false;
};

module.exports = {
    isLocalContentImage,
    isContentImage
};
