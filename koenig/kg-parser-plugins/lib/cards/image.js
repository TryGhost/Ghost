import {addFigCaptionToPayload} from '../helpers';

export function fromImg() {
    return function imgToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'IMG') {
            return;
        }

        let payload = {
            src: node.src,
            alt: node.alt,
            title: node.title
        };

        let cardSection = builder.createCardSection('image', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromFigure(options) {
    return function figureImgToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        let img = node.querySelector('img');
        let kgClass = node.className.match(/kg-width-(wide|full)/);
        let grafClass = node.className.match(/graf--layout(FillWidth|OutsetCenter)/);

        if (!img) {
            return;
        }

        let payload = {
            src: img.src,
            alt: img.alt,
            title: img.title
        };

        if (kgClass) {
            payload.cardWidth = kgClass[1];
        } else if (grafClass) {
            payload.cardWidth = grafClass[1] === 'FillWidth' ? 'full' : 'wide';
        }

        addFigCaptionToPayload(node, payload, {options});

        let cardSection = builder.createCardSection('image', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
