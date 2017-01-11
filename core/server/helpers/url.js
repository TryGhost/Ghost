// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

var hbs            = require('express-hbs'),
    getMetaDataUrl = require('../data/meta/url');

function url(options) {
    var absolute = options && options.hash.absolute,
        url = getMetaDataUrl(this, absolute);

    url = encodeURI(decodeURI(url));

    return new hbs.SafeString(url);
}

module.exports = url;
