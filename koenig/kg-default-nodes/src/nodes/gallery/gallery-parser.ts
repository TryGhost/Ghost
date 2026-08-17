import type {LexicalNode} from 'lexical';
import {readCaptionFromElement} from '../../utils/read-caption-from-element.js';
import {readImageAttributesFromElement} from '../../utils/read-image-attributes-from-element.js';

function readGalleryImageAttributesFromElement(element: HTMLImageElement, imgNum: number) {
    const image = readImageAttributesFromElement(element);

    image.fileName = element.src.match(/[^/]*$/)![0];
    image.row = Math.floor(imgNum / 3);

    return image;
}

export function parseGalleryNode(GalleryNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        figure: (nodeElem: HTMLElement) => {
            // Koenig gallery card
            if (nodeElem.classList?.contains('kg-gallery-card')) {
                return {
                    conversion(domNode: HTMLElement) {
                        const payload: Record<string, unknown> = {};
                        const imgs = Array.from(domNode.querySelectorAll('img'));

                        payload.images = imgs.map(readGalleryImageAttributesFromElement);
                        payload.caption = readCaptionFromElement(domNode);

                        const node = new GalleryNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }

            return null;
        },
        div: (nodeElem: HTMLElement) => {
            // Medium "graf" galleries
            function isGrafGallery(node: HTMLElement) {
                return node.tagName === 'DIV'
                        && node.dataset?.paragraphCount
                        && node.querySelectorAll('img').length > 0;
            }

            if (isGrafGallery(nodeElem)) {
                return {
                    conversion(domNode: HTMLElement) {
                        const payload: Record<string, unknown> = {};
                        const captions = [readCaptionFromElement(domNode)].filter((caption): caption is string => Boolean(caption));

                        // These galleries exist as a series of divs containing multiple figure+img.
                        // Grab the first set of imgs...
                        let imgs = Array.from(domNode.querySelectorAll('img'));

                        // ...and then iterate over any remaining divs until we run out of matches
                        let nextNode = domNode.nextElementSibling as HTMLElement | null;
                        while (nextNode && isGrafGallery(nextNode)) {
                            const currentNode = nextNode;
                            imgs = imgs.concat(Array.from(currentNode.querySelectorAll('img')));

                            const currentNodeCaption = readCaptionFromElement(currentNode);
                            if (currentNodeCaption) {
                                captions.push(currentNodeCaption);
                            }

                            nextNode = currentNode.nextElementSibling as HTMLElement | null;

                            // remove nodes as we go so that they don't go through the parser
                            currentNode.remove();
                        }

                        if (captions.length > 0) {
                            payload.caption = captions.join(' / ');
                        }

                        payload.images = imgs.map(readGalleryImageAttributesFromElement);

                        const node = new GalleryNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }

            // Squarespace SQS galleries
            function isSqsGallery(node: HTMLElement) {
                return node.tagName === 'DIV'
                        && node.className.match(/sqs-gallery-container/)
                        && !node.className.match(/summary-/);
            }

            if (isSqsGallery(nodeElem)) {
                return {
                    conversion(domNode: HTMLElement) {
                        const payload: Record<string, unknown> = {};

                        // Each image exists twice...
                        // The first image is wrapped in `<noscript>`
                        // The second image contains image dimensions but the src property needs to be taken from `data-src`.
                        let imgs: HTMLImageElement[] = Array.from(domNode.querySelectorAll('img.thumb-image'));

                        imgs = imgs.map((img) => {
                            if (!img.getAttribute('src')) {
                                if (img.previousElementSibling?.tagName === 'NOSCRIPT' && img.previousElementSibling.getElementsByTagName('img').length) {
                                    const prevNode = img.previousElementSibling;
                                    img.setAttribute('src', img.getAttribute('data-src') ?? '');
                                    prevNode.remove();
                                } else {
                                    return undefined;
                                }
                            }

                            return img;
                        }).filter(img => img !== undefined);

                        // Process nodes into the payload
                        payload.images = imgs.map(readGalleryImageAttributesFromElement);

                        payload.caption = readCaptionFromElement(domNode, {selector: '.meta-title'});

                        const node = new GalleryNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }

            return null;
        }
    };
}
