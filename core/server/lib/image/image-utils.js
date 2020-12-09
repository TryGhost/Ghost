const BlogIcon = require('./blog-icon');
const CachedImageSizeFromUrl = require('./cached-image-size-from-url');
const Gravatar = require('./gravatar');
const ImageSize = require('./image-size');

class ImageUtils {
    constructor({config, logging, i18n, urlUtils, settingsCache, storageUtils, storage, validator, request}) {
        this.blogIcon = new BlogIcon({config, i18n, urlUtils, settingsCache, storageUtils});
        this.imageSize = new ImageSize({config, i18n, storage, storageUtils, validator, urlUtils, request});
        this.cachedImageSizeFromUrl = new CachedImageSizeFromUrl({logging, imageSize: this.imageSize});
        this.gravatar = new Gravatar({config, request});
    }
}

module.exports = ImageUtils;