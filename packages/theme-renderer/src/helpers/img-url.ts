/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/img_url.js @ 407e032dc7 — transforms: imports→seam
// Usage:
// `{{img_url feature_image}}`
// `{{img_url profile_image absolute="true"}}`
// Note:
// `{{img_url}}` - does not work, argument is required
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.
import {urlUtils} from '../seam/proxy.ts';
import {
    detectInternalImage,
    getImageWithSize,
    getUnsplashImage,
    detectUnsplashImage
} from '../utils/images.ts';

import _ from 'lodash';
import {logging} from '../seam/shared.ts';
import tpl from '@tryghost/tpl';

const messages = {
    attrIsRequired: 'Attribute is required e.g. {{img_url feature_image}}'
};

export default function imgUrl(requestedImageUrl: any, options?: any) {
    // CASE: if no url is passed, e.g. `{{img_url}}` we show a warning
    if (arguments.length < 2) {
        logging.warn(tpl(messages.attrIsRequired));
        return;
    }

    // CASE: if url is passed, but it is undefined, then the attribute was
    // an unknown value, e.g. {{img_url feature_img}} and we also show a warning
    if (requestedImageUrl === undefined) {
        logging.warn(tpl(messages.attrIsRequired));
        return;
    }

    // CASE: if you pass e.g. cover_image, but it is not set, then requestedImageUrl is null!
    // in this case we don't show a warning
    if (requestedImageUrl === null) {
        return;
    }

    // CASE: if you pass an external image, there is nothing we want to do to it!
    const isInternalImage = detectInternalImage(requestedImageUrl);
    const sizeOptions = getImageSizeOptions(options);

    if (!isInternalImage) {
        // Detect Unsplash width and format
        const isUnsplashImage = detectUnsplashImage(requestedImageUrl);
        if (isUnsplashImage) {
            try {
                return getUnsplashImage(requestedImageUrl, sizeOptions);
            } catch (e) {
                // ignore errors and just return the original URL
            }
        }

        return requestedImageUrl;
    }

    const absoluteUrlRequested = getAbsoluteOption(options);

    function applyImageSizes(image: any) {
        return getImageWithSize(image, sizeOptions);
    }

    function getImageUrl(image: any) {
        return urlUtils.urlFor('image', {image}, absoluteUrlRequested);
    }

    function ensureRelativePath(image: any) {
        return urlUtils.absoluteToRelative(image);
    }

    // CASE: only make paths relative if we didn't get a request for an absolute url
    const maybeEnsureRelativePath = !absoluteUrlRequested ? ensureRelativePath : _.identity;

    return maybeEnsureRelativePath(
        getImageUrl(
            applyImageSizes(requestedImageUrl)
        )
    );
}

function getAbsoluteOption(options: any) {
    const absoluteOption = options && options.hash && options.hash.absolute;

    return absoluteOption ? !!absoluteOption && absoluteOption !== 'false' : false;
}

function getImageSizeOptions(options: any) {
    const requestedSize = options && options.hash && options.hash.size;
    const imageSizes = options && options.data && options.data.config && options.data.config.image_sizes;
    const requestedFormat = options && options.hash && options.hash.format;

    return {
        requestedSize,
        imageSizes,
        requestedFormat
    };
}
