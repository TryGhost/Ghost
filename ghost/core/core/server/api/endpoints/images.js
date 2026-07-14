/* eslint-disable ghost/ghost-custom/max-api-complexity */
const path = require('path');
const errors = require('@tryghost/errors');
const imageTransform = require('@tryghost/image-transform');

const storage = require('../../adapters/storage');
const config = require('../../../shared/config');
const imageAltTextService = require('../../services/image-alt-text');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'images',
    generateAltText: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'image_url'
        ],
        permissions: {
            docName: 'posts',
            method: 'edit'
        },
        validation: {
            data: {
                image_url: {
                    required: true
                }
            }
        },
        async query(frame) {
            if (!frame.data.image_url) {
                throw new errors.ValidationError({
                    message: 'A valid Ghost image URL is required.'
                });
            }

            const altText = await imageAltTextService.generate(frame.data.image_url);

            return {
                alt_text: altText
            };
        }
    },
    upload: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        async query(frame) {
            const store = storage.getStorage('images');

            // Normalize
            const imageOptimizationOptions = config.get('imageOptimization');

            // Trim _o from file name (not allowed suffix)
            frame.file.name = frame.file.name.replace(/_o(\.\w+?)$/, '$1');

            // CASE: image transform is not capable of transforming file (e.g. .gif)
            if (imageTransform.shouldResizeFileExtension(frame.file.ext) && imageOptimizationOptions.resize) {
                const out = `${frame.file.path}_processed`;
                const originalPath = frame.file.path;

                const options = Object.assign({
                    in: originalPath,
                    out,
                    ext: frame.file.ext,
                    width: config.get('imageOptimization:defaultMaxWidth')
                }, imageOptimizationOptions);

                try {
                    await imageTransform.resizeFromPath(options);
                } catch (err) {
                    // If the image processing fails, we don't want to store the image because it's corrupted/invalid
                    throw new errors.BadRequestError({
                        message: 'Image processing failed',
                        context: err.message,
                        help: 'Please verify that the image is valid'
                    });
                }

                // Store the processed/optimized image
                const processedImageUrl = await store.save({
                    ...frame.file,
                    path: out
                });

                let processedImageName = path.basename(processedImageUrl);
                let processedImageDir = undefined;

                if (store.urlToPath) {
                    // Currently urlToPath is not part of StorageBase, so not all storage provider have implemented it
                    const processedImagePath = store.urlToPath(processedImageUrl);

                    // Get the path and name of the processed image
                    // We want to store the original image on the same name + _o
                    // So we need to wait for the first store to finish before generating the name of the original image
                    processedImageName = path.basename(processedImagePath);
                    processedImageDir = path.dirname(processedImagePath);
                }

                // Store the original image
                await store.save({
                    ...frame.file,
                    path: originalPath,
                    name: imageTransform.generateOriginalImageName(processedImageName)
                }, processedImageDir);

                return processedImageUrl;
            }

            return store.save(frame.file);
        }
    }
};

module.exports = controller;
