import type {Builder, ParserPlugin, ParserPluginOptions, PluginOptions} from '../types.js';
import {addFigCaptionToPayload, readImageAttributesFromNode} from '../helpers.js';

function readGalleryImageAttributesFromNode(node: HTMLImageElement, imgNum: number): Record<string, unknown> {
    const image = readImageAttributesFromNode(node);
    const match = node.src.match(/[^/]*$/);
    image.fileName = match ? match[0] : '';
    image.row = Math.floor(imgNum / 3);
    return image;
}

export function fromKoenigCard(options: ParserPluginOptions): ParserPlugin {
    return function kgGalleryCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'FIGURE') {
            return;
        }

        const el = node as Element;
        if (!el.className.match(/kg-gallery-card/)) {
            return;
        }

        const payload: Record<string, unknown> = {};
        const imgs = Array.from(el.querySelectorAll('img')) as HTMLImageElement[];

        // Process nodes into the payload
        payload.images = imgs.map(readGalleryImageAttributesFromNode);
        addFigCaptionToPayload(el, payload, {options});

        const cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromGrafGallery(options: ParserPluginOptions): ParserPlugin {
    return function grafGalleryToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        function isGrafGallery(n: Node | null): n is HTMLElement {
            return !!n && n.nodeType === 1 && (n as Element).tagName === 'DIV' && !!(n as HTMLElement).dataset && !!(n as HTMLElement).dataset.paragraphCount && (n as Element).querySelectorAll('img').length > 0;
        }

        if (!isGrafGallery(node)) {
            return;
        }

        const payload: Record<string, unknown> = {};

        // These galleries exist in multiple divs. Read the images and caption from the first one...
        let imgs = Array.from(node.querySelectorAll('img')) as HTMLImageElement[];
        addFigCaptionToPayload(node, payload, {options});

        // ...and then iterate over any remaining divs until we run out of matches
        let nextNode = node.nextSibling;
        while (nextNode && isGrafGallery(nextNode)) {
            const currentNode = nextNode;
            imgs = imgs.concat(Array.from(currentNode.querySelectorAll('img')) as HTMLImageElement[]);
            addFigCaptionToPayload(currentNode, payload, {options});
            nextNode = currentNode.nextSibling;
            // remove nodes as we go so that they don't go through the parser
            currentNode.remove();
        }

        // Process nodes into the payload
        payload.images = imgs.map(readGalleryImageAttributesFromNode);

        const cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromSqsGallery(options: ParserPluginOptions): ParserPlugin {
    return function sqsGalleriesToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'DIV' || !(node as Element).className.match(/sqs-gallery-container/) || (node as Element).className.match(/summary-/)) {
            return;
        }

        const el = node as Element;
        const payload: Record<string, unknown> = {};

        // Each image exists twice...
        // The first image is wrapped in `<noscript>`
        // The second image contains image dimensions but the src property needs to be taken from `data-src`.
        let imgs = Array.from(el.querySelectorAll('img.thumb-image')) as HTMLImageElement[];
        imgs = imgs.map((img: HTMLImageElement) => {
            if (!img.getAttribute('src')) {
                const prevSibling = img.previousSibling as Element | null;
                if (prevSibling && prevSibling.tagName === 'NOSCRIPT' && prevSibling.getElementsByTagName('img').length) {
                    img.setAttribute('src', img.getAttribute('data-src')!);
                    prevSibling.remove();
                } else {
                    return undefined as unknown as HTMLImageElement;
                }
            }
            return img;
        });

        addFigCaptionToPayload(el, payload, {options, selector: '.meta-title'});

        // Process nodes into the payload
        payload.images = imgs.map(readGalleryImageAttributesFromNode);

        const cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
