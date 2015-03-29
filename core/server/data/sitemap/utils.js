var urls = require('../../utils/url'),
    utils;

utils = {
    getDeclarations: function () {
        var baseUrl = urls.urlFor('sitemap-xsl');
        baseUrl = baseUrl.replace(/^(http:|https:)/, '');
        return '<?xml version="1.0" encoding="UTF-8"?>' +
            '<?xml-stylesheet type="text/xsl" href="' + baseUrl + 'sitemap.xsl"?>';
    }
};

module.exports = utils;
