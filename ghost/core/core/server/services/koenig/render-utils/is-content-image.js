const matchesContentImagePath = function (url, baseUrl = '', pattern = /^\/?content\/images\//) {
    const normalized = baseUrl.replace(/\/$/, '');
    const path = url.replace(normalized, '');
    return pattern.test(path);
};

const isLocalContentImage = function (url, siteUrl = '') {
    return matchesContentImagePath(url, siteUrl, /^(\/.*|__GHOST_URL__)\/?content\/images\//);
};

const isContentImage = function (url, siteUrl = '', imageBaseUrl = '') {
    return isLocalContentImage(url, siteUrl) || Boolean(imageBaseUrl && matchesContentImagePath(url, imageBaseUrl));
};

module.exports = {
    isLocalContentImage,
    isContentImage
};
