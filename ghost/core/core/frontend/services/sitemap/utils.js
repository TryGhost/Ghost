const urlUtils = require('../../../shared/url-utils').default;
let sitemapsUtils;

sitemapsUtils = {
    getDeclarations: function () {
        let baseUrl = urlUtils.urlFor('home', true);
        return '<?xml version="1.0" encoding="UTF-8"?>' +
            '<?xml-stylesheet type="text/css" href="' + baseUrl + 'public/sitemap.min.css"?>';
    }
};

module.exports = sitemapsUtils;
