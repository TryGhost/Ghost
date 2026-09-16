const matchesContentImagePath = function (url: string, baseUrl = '', pattern = /^\/?content\/images\//) {
    const normalized = baseUrl.replace(/\/$/, '');
    const path = url.replace(normalized, '');
    return pattern.test(path);
};

export const isLocalContentImage = function (url: string, siteUrl = '') {
    return matchesContentImagePath(url, siteUrl, /^(\/.*|__GHOST_URL__)\/?content\/images\//);
};

export const isContentImage = function (url: string, siteUrl = '', imageBaseUrl = '') {
    return isLocalContentImage(url, siteUrl) || Boolean(imageBaseUrl && matchesContentImagePath(url, imageBaseUrl));
};
