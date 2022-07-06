const urlUtils = require('../../../shared/url-utils');
let sitemapsUtils;

sitemapsUtils = {
    getDeclarations: function () {
        let baseUrl = urlUtils.urlFor('sitemap_xsl', true);
        baseUrl = baseUrl.replace(/^(http:|https:)/, '');
        return '<?xml version="1.0" encoding="UTF-8"?>' +
            '<?xml-stylesheet type="text/xsl" href="' + baseUrl + '"?>';
    }
};

module.exports = sitemapsUtils;
