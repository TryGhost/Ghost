import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {getAvailableImageWidths} from '../../utils/get-available-image-widths.js';
import {isLocalContentImage} from '../../utils/is-local-content-image.js';
import {isUnsplashImage} from '../../utils/is-unsplash-image.js';
import {getResizedImageDimensions} from '../../utils/get-resized-image-dimensions.js';
import {setSrcsetAttribute} from '../../utils/srcset-attribute.js';
import {renderEmptyContainer} from '../../utils/render-empty-container.js';

interface GalleryImage {
    fileName: string;
    src: string;
    width: number;
    height: number;
    alt?: string;
    title?: string;
    row: number;
    href?: string;
}

interface GalleryNodeData {
    images: GalleryImage[];
    caption: string;
}

interface GalleryRenderOptions extends ExportDOMOptions {
    imageOptimization?: {
        defaultMaxWidth?: number;
        contentImageSizes?: Record<string, { width: number }>;
        [key: string]: unknown;
    };
}

const MAX_IMG_PER_ROW = 3;

function isValidImage(image: unknown): image is GalleryImage {
    if (typeof image !== 'object' || image === null) {
        return false;
    }

    const candidate = image as Partial<GalleryImage>;
    const width = candidate.width;
    const height = candidate.height;
    const row = candidate.row;

    return typeof candidate.fileName === 'string'
        && candidate.fileName.trim() !== ''
        && typeof candidate.src === 'string'
        && candidate.src.trim() !== ''
        && typeof width === 'number'
        && Number.isFinite(width)
        && width > 0
        && typeof height === 'number'
        && Number.isFinite(height)
        && height > 0
        && typeof row === 'number'
        && Number.isInteger(row)
        && row >= 0;
}

function buildStructure(images: GalleryImage[]) {
    const rows: GalleryImage[][] = [];
    const noOfImages = images.length;

    images.forEach((image: GalleryImage, idx: number) => {
        let row = image.row;

        if (noOfImages > 1 && (noOfImages % MAX_IMG_PER_ROW === 1) && (idx === (noOfImages - 2))) {
            row = row + 1;
        }
        if (!rows[row]) {
            rows[row] = [];
        }

        rows[row].push(image);
    });

    return rows;
}

export function renderGalleryNode(node: GalleryNodeData, options: GalleryRenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const validImages = node.images.filter(isValidImage);
    if (!validImages.length) {
        return renderEmptyContainer(document);
    }

    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-gallery-card kg-width-wide');

    const container = document.createElement('div');
    container.setAttribute('class', 'kg-gallery-container');
    figure.appendChild(container);

    const rows = buildStructure(validImages);

    rows.forEach((row) => {
        const rowDiv = document.createElement('div');
        rowDiv.setAttribute('class', 'kg-gallery-row');

        row.forEach((image: GalleryImage) => {
            const imgDiv = document.createElement('div');
            imgDiv.setAttribute('class', 'kg-gallery-image');

            const img = document.createElement('img');
            img.setAttribute('src', image.src);
            img.setAttribute('width', String(image.width));
            img.setAttribute('height', String(image.height));
            img.setAttribute('loading', 'lazy');
            img.setAttribute('alt', image.alt || '');
            if (image.title) {
                img.setAttribute('title', image.title);
            }

            // images can be resized to max width, if that's the case output
            // the resized width/height attrs to ensure 3rd party gallery plugins
            // aren't affected by differing sizes
            const {canTransformImage} = options;
            const {defaultMaxWidth} = options.imageOptimization || {};
            if (
                defaultMaxWidth &&
                image.width > defaultMaxWidth &&
                isLocalContentImage(image.src, options.siteUrl) &&
                canTransformImage &&
                canTransformImage(image.src)
            ) {
                const {width, height} = getResizedImageDimensions(image, {width: defaultMaxWidth});
                img.setAttribute('width', String(width));
                img.setAttribute('height', String(height));
            }

            // add srcset+sizes except for email clients which do not have good support for either
            if (options.target !== 'email') {
                setSrcsetAttribute(img, image, options);

                if (img.getAttribute('srcset') && image.width >= 720) {
                    if (rows.length === 1 && row.length === 1 && image.width >= 1200) {
                        img.setAttribute('sizes', '(min-width: 1200px) 1200px');
                    } else {
                        img.setAttribute('sizes', '(min-width: 720px) 720px');
                    }
                }
            }

            // Outlook is unable to properly resize images without a width/height
            // so we modify those to fit max width (600px) and use appropriately
            // resized images if available
            if (options.target === 'email') {
                // only resize if needed, width/height always exists for gallery image unline image cards
                if (image.width > 600) {
                    const newImageDimensions = getResizedImageDimensions(image, {width: 600})!;
                    img.setAttribute('width', String(newImageDimensions.width));
                    img.setAttribute('height', String(newImageDimensions.height));
                }

                const contentImageSizes = options.imageOptimization?.contentImageSizes;
                if (contentImageSizes && isLocalContentImage(image.src, options.siteUrl) && options.canTransformImage?.(image.src)) {
                    // find available image size next up from 2x600 so we can use it for the "retina" src
                    const availableImageWidths = getAvailableImageWidths(image, contentImageSizes);
                    const srcWidth = availableImageWidths.find(width => width >= 1200);

                    if (!srcWidth || srcWidth === image.width) {
                        // do nothing, width is smaller than retina or matches the original payload src
                    } else {
                        const match = image.src.match(/(.*\/content\/images)\/(.*)/);
                        if (match) {
                            const [, imagesPath, filename] = match;
                            img.setAttribute('src', `${imagesPath}/size/w${srcWidth}/${filename}`);
                        }
                    }
                }

                if (isUnsplashImage(image.src)) {
                    const unsplashUrl = new URL(image.src);
                    unsplashUrl.searchParams.set('w', '1200');
                    img.setAttribute('src', unsplashUrl.href);
                }
            }

            if (image.href) {
                const a = document.createElement('a');
                a.setAttribute('href', image.href);
                a.appendChild(img);
                imgDiv.appendChild(a);
            } else {
                imgDiv.appendChild(img);
            }
            rowDiv.appendChild(imgDiv);
        });

        container.appendChild(rowDiv);
    });

    if (node.caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.innerHTML = node.caption;
        figure.appendChild(figcaption);
        figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
    }

    return {element: figure, type: 'outer' as const};
}
