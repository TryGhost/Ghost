const BlogIcon = require('./BlogIcon');
const CachedImageSizeFromUrl = require('./CachedImageSizeFromUrl');
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
    }
}

module.exports = ImageUtils;
