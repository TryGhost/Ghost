// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

var proxy = require('./proxy'),
    SafeString = proxy.SafeString,
    getMetaDataUrl = proxy.metaData.getMetaDataUrl;

module.exports = function url(options) {
    var absolute = options && options.hash.absolute && options.hash.absolute !== 'false',
        outputUrl = getMetaDataUrl(this, absolute);

    outputUrl = encodeURI(decodeURI(outputUrl));

    return new SafeString(outputUrl);
};
