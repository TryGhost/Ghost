module.exports = function isLocalContentImage(url, siteUrl) {
    return /^(\/.*|__GHOST_URL__)\/?content\/images\//.test(url.replace(siteUrl, ''));
};
