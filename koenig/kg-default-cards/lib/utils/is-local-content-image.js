module.exports = function isLocalContentImage(url, siteUrl) {
    return /^\/.*\/?content\/images\//.test(url.replace(siteUrl, ''));
};
