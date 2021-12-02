// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

const {SafeString, metaData} = require('../services/proxy');
const {getMetaDataUrl} = metaData;

module.exports = function url(options) {
    const absolute = options && options.hash.absolute && options.hash.absolute !== 'false';
    let outputUrl = getMetaDataUrl(this, absolute);

    try {
        outputUrl = encodeURI(decodeURI(outputUrl));
    } catch (err) {
        // Happens when the outputURL contains an invalid URI character like "%%" or "%80"
        return new SafeString('');
    }

    return new SafeString(outputUrl);
};
