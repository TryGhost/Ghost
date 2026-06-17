const BlogIcon = require('./blog-icon');
const CachedImageSizeFromUrl = require('./cached-image-size-from-url');
const Gravatar = require('./gravatar');
const ImageSize = require('./image-size');
const probeImageSize = require('probe-image-size');
const externalRequest = require('../request-external');

// Probe image dimensions over the shared keep-alive `got` instance instead of
// probe-image-size's built-in needle client. This reuses sockets across the
// parallel cover/author/og/twitter/logo fetches in meta/image-dimensions.js
// and routes them through the same SSRF protections as other external requests.
// The returned promise exposes the underlying stream via `.stream` so callers
// can destroy it on early abort — otherwise a pooled keep-alive socket leaks.
function probe(url, options = {}, {probeImageSize: probeImageSizeFn = probeImageSize} = {}) {
    const stream = externalRequest.stream(url, {
        headers: options.headers,
        timeout: {
            request: options.response_timeout || 10000
        },
        retry: {limit: 0}
    });
    const promise = probeImageSizeFn(stream);
    promise.stream = stream;
    return promise;
}

class ImageUtils {
    constructor({config, urlUtils, settingsCache, storageUtils, storage, validator, request, cacheStore}) {
        this.blogIcon = new BlogIcon({config, urlUtils, settingsCache, storageUtils});
        this.imageSize = new ImageSize({config, storage, storageUtils, validator, urlUtils, request, probe});
        this.cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: this.imageSize.getImageSizeFromUrl.bind(this.imageSize),
            cache: cacheStore
        });
        this.gravatar = new Gravatar({config, request});
    }
}

module.exports = ImageUtils;
module.exports.probe = probe;
