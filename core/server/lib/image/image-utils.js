const BlogIcon = require('./blog-icon');
const CachedImageSizeFromUrl = require('./cached-image-size-from-url');
const Gravatar = require('./gravatar');
const ImageSize = require('./image-size');

class ImageUtils {
    constructor({config, urlUtils, settingsCache, storageUtils, storage, validator, request}) {
        this.blogIcon = new BlogIcon({config, urlUtils, settingsCache, storageUtils});
        this.imageSize = new ImageSize({config, storage, storageUtils, validator, urlUtils, request});
        this.cachedImageSizeFromUrl = new CachedImageSizeFromUrl({imageSize: this.imageSize});
        this.gravatar = new Gravatar({config, request});
    }
}

module.exports = ImageUtils;
