const BlogIcon = require('./BlogIcon');
const CachedImageSizeFromUrl = require('./CachedImageSizeFromUrl');
const Gravatar = require('./Gravatar');
const ImageSize = require('./ImageSize');
const probe = require('probe-image-size');

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
