import {addFigCaptionToPayload, readImageAttributesFromNode} from '../helpers';

function readGalleryImageAttributesFromNode(node, imgNum) {
    const image = readImageAttributesFromNode(node);

    image.fileName = node.src.match(/[^/]*$/)[0];
    image.row = Math.floor(imgNum / 3);

    return image;
}

export function fromKoenigCard(options) {
    return function kgGalleryCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        if (!node.className.match(/kg-gallery-card/)) {
            return;
        }

        let payload = {};
        let imgs = Array.from(node.querySelectorAll('img'));

        // Process nodes into the payload
        payload.images = imgs.map(readGalleryImageAttributesFromNode);

        addFigCaptionToPayload(node, payload, {options});

        let cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromGrafGallery(options) {
    return function grafGalleryToCard(node, builder, {addSection, nodeFinished}) {
        function isGrafGallery(n) {
            return n.nodeType === 1 && n.tagName === 'DIV' && n.dataset && n.dataset.paragraphCount && n.querySelectorAll('img').length > 0;
        }

        if (!isGrafGallery(node)) {
            return;
        }

        let payload = {};

        // These galleries exist in multiple divs. Read the images and caption from the first one...
        let imgs = Array.from(node.querySelectorAll('img'));
        addFigCaptionToPayload(node, payload, {options});

        // ...and then iterate over any remaining divs until we run out of matches
        let nextNode = node.nextSibling;
        while (nextNode && isGrafGallery(nextNode)) {
            let currentNode = nextNode;
            imgs = imgs.concat(Array.from(currentNode.querySelectorAll('img')));
            addFigCaptionToPayload(currentNode, payload, {options});
            nextNode = currentNode.nextSibling;
            // remove nodes as we go so that they don't go through the parser
            currentNode.remove();
        }

        // Process nodes into the payload
        payload.images = imgs.map(readGalleryImageAttributesFromNode);

        let cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromSqsGallery(options) {
    return function sqsGalleriesToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'DIV' || !node.className.match(/sqs-gallery-container/) || node.className.match(/summary-/)) {
            return;
        }

        let payload = {};

        // Each image exists twice...
        // The first image is wrapped in `<noscript>`
        // The second image contains image dimensions but the src property needs to be taken from `data-src`.
        let imgs = Array.from(node.querySelectorAll('img.thumb-image'));

        imgs = imgs.map((img) => {
            if (!img.getAttribute('src')) {
                if (img.previousSibling.tagName === 'NOSCRIPT' && img.previousSibling.getElementsByTagName('img').length) {
                    const prevNode = img.previousSibling;
                    img.setAttribute('src', img.getAttribute('data-src'));
                    prevNode.remove();
                } else {
                    return undefined;
                }
            }

            return img;
        });

        addFigCaptionToPayload(node, payload, {options, selector: '.meta-title'});

        // Process nodes into the payload
        payload.images = imgs.map(readGalleryImageAttributesFromNode);

        let cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
