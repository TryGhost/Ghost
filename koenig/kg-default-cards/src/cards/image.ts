import {
    isLocalContentImage,
    isUnsplashImage,
    getAvailableImageWidths,
    setSrcsetAttribute,
    resizeImage
} from '../utils/index.js';
import {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady,
    toTransformReady
} from '@tryghost/url-utils/lib/utils';
import type {Card} from '../types.js';

interface ImagePayload {
    src: string;
    width: number;
    height: number;
    cardWidth?: string;
    caption?: string;
    alt?: string;
    title?: string;
    href?: string;
}

const imageCard: Card = {
    name: 'image',
    type: 'dom',

    render({payload: _payload, env: {dom}, options = {}}) {
        const payload = _payload as unknown as ImagePayload;
        if (!payload.src) {
            return dom.createTextNode('');
        }

        const figure = dom.createElement('figure');
        let figureClass = 'kg-card kg-image-card';
        if (payload.cardWidth) {
            figureClass = `${figureClass} kg-width-${payload.cardWidth}`;
        }
        figure.setAttribute('class', figureClass);

        const img = dom.createElement('img');
        img.setAttribute('src', payload.src);
        img.setAttribute('class', 'kg-image');
        img.setAttribute('alt', payload.alt || '');
        img.setAttribute('loading', 'lazy');

        if (payload.title) {
            img.setAttribute('title', payload.title);
        }

        if (payload.width && payload.height) {
            img.setAttribute('width', payload.width);
            img.setAttribute('height', payload.height);
        }

        // images can be resized to max width, if that's the case output
        // the resized width/height attrs to ensure 3rd party gallery plugins
        // aren't affected by differing sizes
        const {canTransformImage} = options;
        const {defaultMaxWidth} = options.imageOptimization || {};
        if (
            defaultMaxWidth &&
            payload.width > defaultMaxWidth &&
            isLocalContentImage(payload.src, options.siteUrl) &&
            canTransformImage &&
            canTransformImage(payload.src)
        ) {
            const resized = resizeImage(payload, {width: defaultMaxWidth});
            img.setAttribute('width', resized.width);
            img.setAttribute('height', resized.height);
        }

        // add srcset unless it's an email, email clients do not have good support for srcset or sizes
        if (options.target !== 'email') {
            setSrcsetAttribute(img, payload, options);

            if (img.getAttribute('srcset') && payload.width && payload.width >= 720) {
                // standard size
                if (!payload.cardWidth) {
                    img.setAttribute('sizes', '(min-width: 720px) 720px');
                }

                if (payload.cardWidth === 'wide' && payload.width >= 1200) {
                    img.setAttribute('sizes', '(min-width: 1200px) 1200px');
                }
            }
        }

        // Outlook is unable to properly resize images without a width/height
        // so we add that at the expected size in emails (600px) and use a higher
        // resolution image to keep images looking good on retina screens
        if (options.target === 'email' && payload.width && payload.height) {
            let imageDimensions: {width: number; height: number} = {
                width: payload.width,
                height: payload.height
            };
            if (payload.width >= 600) {
                imageDimensions = resizeImage(imageDimensions, {width: 600});
            }
            img.setAttribute('width', imageDimensions.width);
            img.setAttribute('height', imageDimensions.height);

            if (isLocalContentImage(payload.src, options.siteUrl) && options.canTransformImage && options.canTransformImage(payload.src)) {
                // find available image size next up from 2x600 so we can use it for the "retina" src
                const availableImageWidths = getAvailableImageWidths(payload, options.imageOptimization!.contentImageSizes!);
                const srcWidth = availableImageWidths.find(width => width >= 1200);

                if (!srcWidth || srcWidth === payload.width) {
                    // do nothing, width is smaller than retina or matches the original payload src
                } else {
                    const srcMatch = payload.src.match(/(.*\/content\/images)\/(.*)/);
                    if (srcMatch) {
                        const [, imagesPath, filename] = srcMatch;
                        img.setAttribute('src', `${imagesPath}/size/w${srcWidth}/${filename}`);
                    }
                }
            }
        }

        // always resize Unsplash images in emails to avoid HUGE images in
        // Outlook when we don't have width/height data available
        if (options.target === 'email' && isUnsplashImage(payload.src)) {
            const unsplashUrl = new URL(payload.src);
            unsplashUrl.searchParams.set('w', '1200');
            img.setAttribute('src', unsplashUrl.href);
        }

        if (payload.href) {
            const a = dom.createElement('a');
            a.setAttribute('href', payload.href);
            a.appendChild(img);
            figure.appendChild(a);
        } else {
            figure.appendChild(img);
        }

        if (payload.caption) {
            const figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    },

    absoluteToRelative(payload, options) {
        const p = payload as unknown as ImagePayload;
        p.src = p.src && absoluteToRelative(p.src, options.siteUrl, options);
        p.caption = p.caption && htmlAbsoluteToRelative(p.caption, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        const p = payload as unknown as ImagePayload;
        p.src = p.src && relativeToAbsolute(p.src, options.siteUrl, options.itemUrl ?? '', options);
        p.caption = p.caption && htmlRelativeToAbsolute(p.caption, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        const p = payload as unknown as ImagePayload;
        p.src = p.src && toTransformReady(p.src, options.siteUrl, options);
        p.caption = p.caption && htmlToTransformReady(p.caption, options.siteUrl, options);
        return payload;
    }
};

export default imageCard;
