import type {ExportDOMOptions} from '../export-dom.js';
import {isLocalContentImage} from './is-local-content-image.js';
import {getAvailableImageWidths} from './get-available-image-widths.js';
import {isUnsplashImage} from './is-unsplash-image.js';

// default content sizes: [600, 1000, 1600, 2400]

export interface ImageRenderOptions extends ExportDOMOptions {
    imageOptimization?: {
        srcsets?: boolean;
        contentImageSizes?: Record<string, {width: number}>;
    };
}

export const getSrcsetAttribute = function ({src, width, options}: {src: string; width: number; options: ImageRenderOptions}) {
    if (!options.imageOptimization || options.imageOptimization.srcsets === false || !width || !options.imageOptimization.contentImageSizes) {
        return;
    }

    if (isLocalContentImage(src, options.siteUrl) && options.canTransformImage && !options.canTransformImage(src)) {
        return;
    }

    const srcsetWidths = getAvailableImageWidths({width}, options.imageOptimization.contentImageSizes);

    // apply srcset if this is a relative image that matches Ghost's image url structure
    if (isLocalContentImage(src, options.siteUrl)) {
        const match = src.match(/(.*\/content\/images)\/(.*)/);
        if (!match) {
            return;
        }

        const [, imagesPath, filename] = match;
        const srcs: string[] = [];

        srcsetWidths.forEach((srcsetWidth) => {
            if (srcsetWidth === width) {
                // use original image path if width matches exactly (avoids 302s from size->original)
                srcs.push(`${src} ${srcsetWidth}w`);
            } else if (srcsetWidth <= width) {
                // avoid creating srcset sizes larger than intrinsic image width
                srcs.push(`${imagesPath}/size/w${srcsetWidth}/${filename} ${srcsetWidth}w`);
            }
        });

        if (srcs.length) {
            return srcs.join(', ');
        }
    }

    // apply srcset if this is an Unsplash image
    if (isUnsplashImage(src)) {
        const unsplashUrl = new URL(src);
        const srcs: string[] = [];

        srcsetWidths.forEach((srcsetWidth) => {
            unsplashUrl.searchParams.set('w', String(srcsetWidth));
            srcs.push(`${unsplashUrl.href} ${srcsetWidth}w`);
        });

        return srcs.join(', ');
    }
};

export const setSrcsetAttribute = function (elem: Element | null, image: {src: string; width: number}, options: ImageRenderOptions) {
    if (!elem || !['IMG', 'SOURCE'].includes(elem.tagName) || !elem.getAttribute('src') || !image) {
        return;
    }

    const {src, width} = image;
    const srcset = getSrcsetAttribute({src, width, options});

    if (srcset) {
        elem.setAttribute('srcset', srcset);
    }
};
