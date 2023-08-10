import {getAvailableImageWidths} from '../../utils/get-available-image-widths';
import {isLocalContentImage} from '../../utils/is-local-content-image';
import {setSrcsetAttribute} from '../../utils/srcset-attribute';
import {resizeImage} from '../../utils/resize-image';
import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../utils/render-empty-container';

export function renderImageNode(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.src || node.src.trim() === '') {
        return renderEmptyContainer(document);
    }

    const figure = document.createElement('figure');

    let figureClasses = 'kg-card kg-image-card';
    if (node.cardWidth !== 'regular') {
        figureClasses += ` kg-width-${node.cardWidth}`;
    }
    if (node.caption) {
        figureClasses += ' kg-card-hascaption';
    }

    figure.setAttribute('class', figureClasses);

    const img = document.createElement('img');
    img.setAttribute('src', node.src);
    img.setAttribute('class', 'kg-image');
    img.setAttribute('alt', node.alt);
    img.setAttribute('loading', 'lazy');

    if (node.title) {
        img.setAttribute('title', node.title);
    }

    if (node.width && node.height) {
        img.setAttribute('width', node.width);
        img.setAttribute('height', node.height);
    }

    // images can be resized to max width, if that's the case output
    // the resized width/height attrs to ensure 3rd party gallery plugins
    // aren't affected by differing sizes
    const {canTransformImage} = options;
    const {defaultMaxWidth} = options.imageOptimization || {};
    if (
        defaultMaxWidth &&
            node.width > defaultMaxWidth &&
            isLocalContentImage(node.src, options.siteUrl) &&
            canTransformImage &&
            canTransformImage(node.src)
    ) {
        const imageDimensions = {
            width: node.width,
            height: node.height
        };
        const {width, height} = resizeImage(imageDimensions, {width: defaultMaxWidth});
        img.setAttribute('width', width);
        img.setAttribute('height', height);
    }

    if (options.target !== 'email') {
        const imgAttributes = {
            src: node.src,
            width: node.width,
            height: node.height
        };
        setSrcsetAttribute(img, imgAttributes, options);

        if (img.getAttribute('srcset') && node.width && node.width >= 720) {
            // standard size
            if (!node.cardWidth || node.cardWidth === 'regular') {
                img.setAttribute('sizes', '(min-width: 720px) 720px');
            }

            if (node.cardWidth === 'wide' && node.width >= 1200) {
                img.setAttribute('sizes', '(min-width: 1200px) 1200px');
            }
        }
    }

    // Outlook is unable to properly resize images without a width/height
    // so we add that at the expected size in emails (600px) and use a higher
    // resolution image to keep images looking good on retina screens
    if (options.target === 'email' && node.width && node.height) {
        let imageDimensions = {
            width: node.width,
            height: node.height
        };
        if (node.width >= 600) {
            imageDimensions = resizeImage(imageDimensions, {width: 600});
        }
        img.setAttribute('width', imageDimensions.width);
        img.setAttribute('height', imageDimensions.height);

        if (isLocalContentImage(node.src, options.siteUrl) && options.canTransformImage?.(node.src)) {
            // find available image size next up from 2x600 so we can use it for the "retina" src
            const availableImageWidths = getAvailableImageWidths(node, options.imageOptimization.contentImageSizes);
            const srcWidth = availableImageWidths.find(width => width >= 1200);

            if (!srcWidth || srcWidth === node.width) {
                // do nothing, width is smaller than retina or matches the original node src
            } else {
                const [, imagesPath, filename] = node.src.match(/(.*\/content\/images)\/(.*)/);
                img.setAttribute('src', `${imagesPath}/size/w${srcWidth}/${filename}`);
            }
        }
    }

    if (node.href) {
        const a = document.createElement('a');
        a.setAttribute('href', node.href);
        a.appendChild(img);
        figure.appendChild(a);
    } else {
        figure.appendChild(img);
    }

    if (node.caption) {
        const caption = document.createElement('figcaption');
        caption.innerHTML = node.caption;
        figure.appendChild(caption);
    }

    return {element: figure};
}
