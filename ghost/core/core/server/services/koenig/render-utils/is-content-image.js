const matchesContentImagePath = function (url, baseUrl = '', pattern = /^\/?content\/images\//) {
    const normalized = baseUrl.replace(/\/$/, '');
    const path = url.replace(normalized, '');
    return pattern.test(path);
};

const isLocalContentImage = function (url, siteUrl = '') {
    return matchesContentImagePath(url, siteUrl, /^(\/.*|__GHOST_URL__)\/?content\/images\//);
};

const isContentImage = function (url, siteUrl = '', imageBaseUrl = '') {
    const isLocal = isLocalContentImage(url, siteUrl);
    const isCdn = Boolean(imageBaseUrl && matchesContentImagePath(url, imageBaseUrl));
    console.log('[IMAGE-CDN-TEST] isContentImage (koenig)', {url, siteUrl, imageBaseUrl, isLocal, isCdn, result: isLocal || isCdn});
    return isLocal || isCdn;
};

module.exports = {
    isLocalContentImage,
    isContentImage
};
