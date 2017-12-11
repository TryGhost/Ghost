var urlService = require('../../../services/url'),
    sitemapsUtils;

sitemapsUtils = {
    getDeclarations: function () {
        var baseUrl = urlService.utils.urlFor('sitemap_xsl', true);
        baseUrl = baseUrl.replace(/^(http:|https:)/, '');
        return '<?xml version="1.0" encoding="UTF-8"?>' +
            '<?xml-stylesheet type="text/xsl" href="' + baseUrl + '"?>';
    }
};

module.exports = sitemapsUtils;
