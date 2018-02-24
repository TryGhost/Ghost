// # Meta Title Helper
// Usage: `{{meta_title}}`
//
// Page title used for sharing and SEO
var proxy = require('./proxy'),
    _ = require('lodash'),
    getMetaDataTitle = proxy.metaData.getMetaDataTitle;

// We use the name meta_title to match the helper for consistency:
module.exports = function meta_title(options) { // eslint-disable-line camelcase

    if (_.includes(options, 'hash.page')){
        options.data.root.pagination.pagestring = options.hash.page.replace('%', options.data.root.pagination.page);
    }

    return getMetaDataTitle(this, options.data.root);
};
