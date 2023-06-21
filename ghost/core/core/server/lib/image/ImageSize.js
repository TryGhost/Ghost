const debug = require('@tryghost/debug')('utils:image-size');
const sizeOf = require('image-size');
const probeSizeOf = require('probe-image-size');
const url = require('url');
const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidDimensions: 'Could not fetch image dimensions.'
};

// these are formats supported by image-size but not probe-image-size
const FETCH_ONLY_FORMATS = [
    'cur', 'icns', 'dds'
];

class ImageSize {
    constructor({config, storage, storageUtils, validator, urlUtils, request}) {
        this.config = config;
        this.storage = storage;
        this.storageUtils = storageUtils;
        this.validator = validator;
        this.urlUtils = urlUtils;
        this.request = request;

        this.REQUEST_OPTIONS = {
            // we need the user-agent, otherwise some https request may fail (e.g. cloudfare)
            headers: {
                'User-Agent': 'Mozilla/5.0 Safari/537.36'
            },
            timeout: this.config.get('times:getImageSizeTimeoutInMS') || 10000,
            retry: 0, // for `got`, used with image-size
            encoding: null
        };

        this.NEEDLE_OPTIONS = {
            // we need the user-agent, otherwise some https request may fail (e.g. cloudflare)
            headers: {
                'User-Agent': 'Mozilla/5.0 Safari/537.36'
            },
            response_timeout: this.config.get('times:getImageSizeTimeoutInMS') || 10000
        };
    }

    // processes the Buffer result of an image file using image-size
    // returns promise which resolves dimensions
    _imageSizeFromBuffer(buffer) {
        return new Promise((resolve, reject) => {
            try {
                const dimensions = sizeOf(buffer);

                // CASE: `.ico` files might have multiple images and therefore multiple sizes.
                // We return the largest size found (image-size default is the first size found)
                if (dimensions.images) {
                    dimensions.width = _.maxBy(dimensions.images, img => img.width).width;
                    dimensions.height = _.maxBy(dimensions.images, img => img.height).height;
                }

                return resolve(dimensions);
            } catch (err) {
                return reject(err);
            }
        });
    }

    // use probe-image-size to download enough of an image to get it's dimensions
    // returns promise which resolves dimensions
    _probeImageSizeFromUrl(imageUrl) {
        // probe-image-size uses `request` npm module which doesn't have our `got`
        // override with custom URL validation so it needs duplicating here
        if (_.isEmpty(imageUrl) || !this.validator.isURL(imageUrl)) {
            return Promise.reject(new errors.InternalServerError({
                message: 'URL empty or invalid.',
                code: 'URL_MISSING_INVALID',
                context: imageUrl
            }));
        }

        return probeSizeOf(imageUrl, this.NEEDLE_OPTIONS);
    }

    // download full image then use image-size to get it's dimensions
    // returns promise which resolves dimensions
    _fetchImageSizeFromUrl(imageUrl) {
        return this.request(imageUrl, this.REQUEST_OPTIONS).then((response) => {
            return this._imageSizeFromBuffer(response.body);
        });
    }

    // wrapper for appropriate probe/fetch method for getting image dimensions from a URL
    // returns promise which resolves dimensions
    _imageSizeFromUrl(imageUrl) {
        return new Promise((resolve, reject) => {
            let parsedUrl;

            try {
                parsedUrl = url.parse(imageUrl);
            } catch (err) {
                reject(err);
            }

            // check if we got an url without any protocol
            if (!parsedUrl.protocol) {
                // CASE: our gravatar URLs start with '//' and we need to add 'http:'
                // to make the request work
                imageUrl = 'http:' + imageUrl;
            }

            const extensionMatch = imageUrl.match(/(?:\.)([a-zA-Z]{3,4})(\?|$)/) || [];
            const extension = (extensionMatch[1] || '').toLowerCase();

            if (FETCH_ONLY_FORMATS.includes(extension)) {
                return resolve(this._fetchImageSizeFromUrl(imageUrl));
            } else {
                return resolve(this._probeImageSizeFromUrl(imageUrl));
            }
        });
    }
    // Supported formats of https://github.com/image-size/image-size:
    // BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG, ICO
    // ***
    // Takes the url of the image and an optional timeout
    // getImageSizeFromUrl returns an Object like this
    // {
    //     height: 50,
    //     url: 'http://myblog.com/images/cat.jpg',
    //     width: 50
    // };
    // if the dimensions can be fetched, and rejects with error, if not.
    // ***
    // In case we get a locally stored image, which is checked within the `isLocalImage`
    // function we switch to read the image from the local file storage with `getImageSizeFromStoragePath`.
    // In case the image is not stored locally and is missing the protocol (like //www.gravatar.com/andsoon),
    // we add the protocol and use urlFor() to get the absolute URL.
    // If the request fails or image-size is not able to read the file, we reject with error.

    /**
     * @description read image dimensions from URL
     * @param {string} imagePath as URL
     * @returns {Promise<Object>} imageObject or error
     */
    getImageSizeFromUrl(imagePath) {
        if (this.storageUtils.isLocalImage(imagePath)) {
            // don't make a request for a locally stored image
            return this.getImageSizeFromStoragePath(imagePath);
        }

        // CASE: pre 1.0 users were able to use an asset path for their blog logo
        if (imagePath.match(/^\/assets/)) {
            imagePath = this.urlUtils.urlJoin(this.urlUtils.urlFor('home', true), this.urlUtils.getSubdir(), '/', imagePath);
        }

        debug('requested imagePath:', imagePath);

        return this._imageSizeFromUrl(imagePath).then((dimensions) => {
            debug('Image fetched (URL):', imagePath);

            return {
                url: imagePath,
                width: dimensions.width,
                height: dimensions.height
            };
        }).catch((err) => {
            if (err.code === 'URL_MISSING_INVALID') {
                return Promise.reject(new errors.InternalServerError({
                    message: err.message,
                    code: 'IMAGE_SIZE_URL',
                    statusCode: err.statusCode,
                    context: err.url || imagePath
                }));
            } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT' || err.code === 'ECONNRESET' || err.statusCode === 408) {
                return Promise.reject(new errors.InternalServerError({
                    message: 'Request timed out.',
                    code: 'IMAGE_SIZE_URL',
                    statusCode: err.statusCode,
                    context: err.url || imagePath
                }));
            } else if (err.code === 'ENOENT' || err.code === 'ENOTFOUND' || err.statusCode === 404) {
                return Promise.reject(new errors.NotFoundError({
                    message: 'Image not found.',
                    code: 'IMAGE_SIZE_URL',
                    statusCode: err.statusCode,
                    context: err.url || imagePath
                }));
            } else {
                if (errors.utils.isGhostError(err)) {
                    return Promise.reject(err);
                }

                return Promise.reject(new errors.InternalServerError({
                    message: 'Unknown Request error.',
                    code: 'IMAGE_SIZE_URL',
                    statusCode: err.statusCode,
                    context: err.url || imagePath,
                    err: err
                }));
            }
        });
    }

    // Supported formats of https://github.com/image-size/image-size:
    // BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG, ICO
    // ***
    // Takes the url or filepath of the image and reads it form the local
    // file storage.
    // getImageSizeFromStoragePath returns an Object like this
    // {
    //     height: 50,
    //     url: 'http://myblog.com/images/cat.jpg',
    //     width: 50
    // };
    // if the image is found and dimensions can be fetched, and rejects with error, if not.
    /**
     * @description read image dimensions from local file storage
     * @param {string} imagePath
     * @returns {object} imageObject or error
     */
    getImageSizeFromStoragePath(imagePath) {
        let filePath;

        imagePath = this.urlUtils.urlFor('image', {image: imagePath}, true);

        // get the storage readable filePath
        filePath = this.storageUtils.getLocalImagesStoragePath(imagePath);

        return this.storage.getStorage('images')
            .read({path: filePath})
            .then((buf) => {
                debug('Image fetched (storage):', filePath);
                return this._imageSizeFromBuffer(buf);
            })
            .then((dimensions) => {
                return {
                    url: imagePath,
                    width: dimensions.width,
                    height: dimensions.height
                };
            })
            .catch((err) => {
                if (err.code === 'ENOENT') {
                    return Promise.reject(new errors.NotFoundError({
                        message: err.message,
                        code: 'IMAGE_SIZE_STORAGE',
                        err: err,
                        context: filePath,
                        errorDetails: {
                            originalPath: imagePath,
                            reqFilePath: filePath
                        }
                    }));
                } else {
                    if (errors.utils.isGhostError(err)) {
                        return Promise.reject(err);
                    }

                    return Promise.reject(new errors.InternalServerError({
                        message: err.message,
                        code: 'IMAGE_SIZE_STORAGE',
                        err: err,
                        context: filePath,
                        errorDetails: {
                            originalPath: imagePath,
                            reqFilePath: filePath
                        }
                    }));
                }
            });
    }

    /**
     * Returns the path of the original image for a given image path (we always store the original image in a separate file, suffixed with _o, while we store a resized version of the image on the original name)
     * TODO: Preferrably we want to move this to a separate image utils package. Currently not really a good place to put it in image lib.
     */
    async getOriginalImagePath(imagePath) {
        const {dir, name, ext} = path.parse(imagePath);
        const storageInstance = this.storage.getStorage('images');

        const preferredUnoptimizedImagePath = path.join(dir, `${name}_o${ext}`);
        const preferredUnoptimizedImagePathExists = await storageInstance.exists(preferredUnoptimizedImagePath);
        if (preferredUnoptimizedImagePathExists) {
            return preferredUnoptimizedImagePath;
        }

        // Legacy format did some magic with the numbers that could cause bugs. We still need to support it for old files.
        // refs https://github.com/TryGhost/Team/issues/481
        const [imageNameMatched, imageName, imageNumber] = name.match(/^(.+?)(-\d+)?$/) || [null];

        if (!imageNameMatched) {
            return imagePath;
        }

        const legacyOriginalImagePath = path.join(dir, `${imageName}_o${imageNumber || ''}${ext}`);
        const legacyOriginalImageExists = await storageInstance.exists(legacyOriginalImagePath);

        return legacyOriginalImageExists ? legacyOriginalImagePath : imagePath;
    }

    async getOriginalImageSizeFromStoragePath(imagePath) {
        return this.getImageSizeFromStoragePath(await this.getOriginalImagePath(imagePath));
    }

    _getPathFromUrl(imageUrl) {
        // local storage adapter's .exists() expects image paths without any prefixes
        const subdirRegex = new RegExp(`^${this.urlUtils.getSubdir()}`);
        const contentRegex = new RegExp(`^/${this.urlUtils.STATIC_IMAGE_URL_PREFIX}`);
        const storagePath = imageUrl.replace(subdirRegex, '').replace(contentRegex, '');

        return storagePath;
    }

    getImageSizeFromStorageUrl(imageUrl) {
        return this.getImageSizeFromStoragePath(this._getPathFromUrl(imageUrl));
    }

    getOriginalImageSizeFromStorageUrl(imageUrl) {
        return this.getOriginalImageSizeFromStoragePath(this._getPathFromUrl(imageUrl));
    }

    /**
     * Supported formats of https://github.com/image-size/image-size:
     * BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG, ICO
     * Get dimensions for a file from its real file storage path
     * Always returns {object} getImageDimensions
     * @param {string} imagePath
     * @returns {Promise<Object>} getImageDimensions
     * @description Takes a file path and returns width and height.
     */
    getImageSizeFromPath(imagePath) {
        return new Promise(function getSize(resolve, reject) {
            let dimensions;

            try {
                dimensions = sizeOf(imagePath);

                if (dimensions.images) {
                    dimensions.width = _.maxBy(dimensions.images, (w) => {
                        return w.width;
                    }).width;
                    dimensions.height = _.maxBy(dimensions.images, (h) => {
                        return h.height;
                    }).height;
                }

                return resolve({
                    width: dimensions.width,
                    height: dimensions.height
                });
            } catch (err) {
                return reject(new errors.ValidationError({
                    message: tpl(messages.invalidDimensions, {
                        file: imagePath,
                        error: err.message
                    })
                }));
            }
        });
    }
}

module.exports = ImageSize;
