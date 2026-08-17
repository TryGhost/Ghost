import type {CardRenderOptions} from '../types.js';
import isLocalContentImage from './is-local-content-image.js';
import isUnsplashImage from './is-unsplash-image.js';
import resizeImage from './resize-image.js';
import {getSrcsetAttribute} from './srcset-attribute.js';
import getAvailableImageWidths from './get-available-image-widths.js';

const escapeExpression = (str: string | number = ''): string => {
    if (typeof str === 'number') {
        str = str.toString();
    }
    return str.replace(/&/g, '&amp;');
};

interface ImgDimensionArgs {
    src?: string;
    width?: number;
    height?: number;
    options?: CardRenderOptions;
}

const getMaxResizedImgDimensions = function ({src, width, height, options = {}}: ImgDimensionArgs = {}): {width?: number; height?: number} {
    const originalWidth = width;
    const originalHeight = height;

    const {canTransformImage} = options;
    const {defaultMaxWidth} = options.imageOptimization || {};
    if (
        defaultMaxWidth &&
        originalWidth && originalWidth > defaultMaxWidth &&
        src && isLocalContentImage(src, options.siteUrl) &&
        canTransformImage &&
        canTransformImage(src)
    ) {
        const resized = resizeImage({width: originalWidth, height: originalHeight!}, {width: defaultMaxWidth});
        if (resized) {
            ({width, height} = resized);
        }
    }

    return {
        width,
        height
    };
};

interface GenerateImgAttrsArgs {
    src?: string;
    width?: number;
    height?: number;
    options?: CardRenderOptions;
}

const generateImgSrcAttrs = function ({src, width, height, options = {}}: GenerateImgAttrsArgs = {}): string | undefined {
    if (!src) {
        return;
    }

    const attrs: Record<string, string | number | undefined> = {
        src,
        width,
        height
    };

    // images can be resized to max width, if that's the case output
    // the resized width/height attrs to ensure 3rd party gallery plugins
    // aren't affected by differing sizes
    if (width && height) {
        Object.assign(attrs, getMaxResizedImgDimensions({src, width, height, options}));
    }

    // add srcset unless it's an email, email clients do not have good support for srcset or sizes
    if (options.target !== 'email') {
        const srcset = getSrcsetAttribute({src, width: width!, options});

        attrs.srcset = srcset;

        if (srcset && width && width >= 720) {
            // standard size
            // if (!payload.cardWidth) {
            attrs.sizes = '(min-width: 720px) 720px';
            // }

            // if (payload.cardWidth === 'wide' && payload.width >= 1200) {
            //     img.setAttribute('sizes', '(min-width: 1200px) 1200px');
            // }
        }
    }

    // email-specific attributes
    if (options.target === 'email') {
        // Outlook is unable to properly resize images without a width/height
        // so we add that at the expected size in emails (600px) and use a higher
        // resolution image to keep images looking good on retina screens
        if (width && height) {
            let imageDimensions = {
                width: width,
                height: height
            };
            if (width >= 600) {
                const resized = resizeImage(imageDimensions, {width: 600});
                if (resized) {
                    imageDimensions = resized;
                }
            }

            attrs.width = imageDimensions.width;
            attrs.height = imageDimensions.height;

            if (isLocalContentImage(src, options.siteUrl) && options.canTransformImage && options.canTransformImage(src)) {
                // find available image size next up from 2x600 so we can use it for the "retina" src
                const availableImageWidths = getAvailableImageWidths({width}, options.imageOptimization!.contentImageSizes!);
                const srcWidth = availableImageWidths.find(availableImageWidth => availableImageWidth >= 1200);

                if (!srcWidth || srcWidth === width) {
                    // do nothing, width is smaller than retina or matches the original payload src
                } else {
                    const match = src.match(/(.*\/content\/images)\/(.*)/);
                    if (match) {
                        const [, imagesPath, filename] = match;
                        attrs.src = `${imagesPath}/size/w${srcWidth}/${filename}`;
                    }
                }
            }
        }

        // always resize Unsplash images in emails to avoid HUGE images in
        // Outlook when we don't have width/height data available
        if (isUnsplashImage(src)) {
            const unsplashUrl = new URL(src);
            unsplashUrl.searchParams.set('w', '1200');

            attrs.src = unsplashUrl.href;
        }
    }

    return Object.keys(attrs)
        .map(key => attrs[key] !== undefined && `${key}="${escapeExpression(attrs[key]!)}"`)
        .filter(Boolean)
        .join(' ');
};

export default generateImgSrcAttrs;
