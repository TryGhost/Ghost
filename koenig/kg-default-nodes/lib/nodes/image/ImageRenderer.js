import {getAvailableImageWidths} from '../../utils/get-available-image-widths';
import {isLocalContentImage} from '../../utils/is-local-content-image';
import {setSrcsetAttribute} from '../../utils/srcset-attribute';
import {resizeImage} from '../../utils/resize-image';
import {addCreateDocumentOption} from '../../utils/add-create-document-option';

export function renderImageNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.getSrc() || node.getSrc().trim() === '') {
        return document.createTextNode('');
    }

    const figure = document.createElement('figure');

    let figureClasses = 'kg-card kg-image-card';
    if (node.getCardWidth() !== 'regular') {
        figureClasses += ` kg-width-${node.getCardWidth()}`;
    }

    figure.setAttribute('class', figureClasses);

    const img = document.createElement('img');
    img.setAttribute('src', node.getSrc());
    img.setAttribute('alt', node.getAltText());
    img.setAttribute('loading', 'lazy');

    if (node.getTitle()) {
        img.setAttribute('title', node.getTitle());
    }

    if (node.getImgWidth() && node.getImgHeight()) {
        img.setAttribute('width', node.getImgWidth());
        img.setAttribute('height', node.getImgHeight());
    }

    // images can be resized to max width, if that's the case output
    // the resized width/height attrs to ensure 3rd party gallery plugins
    // aren't affected by differing sizes
    const {canTransformImage} = options;
    const {defaultMaxWidth} = options.imageOptimization || {};
    if (
        defaultMaxWidth &&
            node.getImgWidth() > defaultMaxWidth &&
            isLocalContentImage(node.getSrc(), options.siteUrl) &&
            canTransformImage &&
            canTransformImage(node.getSrc())
    ) {
        const imageDimensions = {
            width: node.getImgWidth(),
            height: node.getImgHeight()
        };
        const {width, height} = resizeImage(imageDimensions, {width: defaultMaxWidth});
        img.setAttribute('width', width);
        img.setAttribute('height', height);
    }

    if (options.target !== 'email') {
        const imgAttributes = {
            src: node.getSrc(),
            width: node.getImgWidth(),
            height: node.getImgHeight()
        };
        setSrcsetAttribute(img, imgAttributes, options);

        if (img.getAttribute('srcset') && node.getImgWidth() && node.getImgWidth() >= 720) {
            // standard size
            if (!node.getCardWidth() || node.getCardWidth() === 'regular') {
                img.setAttribute('sizes', '(min-width: 720px) 720px');
            }

            if (node.getCardWidth() === 'wide' && node.getImgWidth() >= 1200) {
                img.setAttribute('sizes', '(min-width: 1200px) 1200px');
            }
        }
    }

    // Outlook is unable to properly resize images without a width/height
    // so we add that at the expected size in emails (600px) and use a higher
    // resolution image to keep images looking good on retina screens
    if (options.target === 'email' && node.getImgWidth() && node.getImgHeight()) {
        let imageDimensions = {
            width: node.getImgWidth(),
            height: node.getImgHeight()
        };
        if (node.getImgWidth() >= 600) {
            imageDimensions = resizeImage(imageDimensions, {width: 600});
        }
        img.setAttribute('width', imageDimensions.width);
        img.setAttribute('height', imageDimensions.height);

        if (isLocalContentImage(node.getSrc(), options.siteUrl) && options.canTransformImage?.(node.getSrc())) {
            // find available image size next up from 2x600 so we can use it for the "retina" src
            const availableImageWidths = getAvailableImageWidths(node, options.imageOptimization.contentImageSizes);
            const srcWidth = availableImageWidths.find(width => width >= 1200);

            if (!srcWidth || srcWidth === node.getImgWidth()) {
                // do nothing, width is smaller than retina or matches the original node src
            } else {
                const [, imagesPath, filename] = node.getSrc().match(/(.*\/content\/images)\/(.*)/);
                img.setAttribute('src', `${imagesPath}/size/w${srcWidth}/${filename}`);
            }
        }
    }

    if (node.getHref()) {
        const a = document.createElement('a');
        a.setAttribute('href', node.getHref());
        a.appendChild(img);
        figure.appendChild(a);
    } else {
        figure.appendChild(img);
    }

    if (node.getCaption()) {
        const caption = document.createElement('figcaption');
        caption.innerHTML = node.getCaption();
        figure.appendChild(caption);
    }

    return figure;
}
