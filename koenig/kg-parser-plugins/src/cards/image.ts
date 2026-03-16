import {addFigCaptionToPayload, readImageAttributesFromNode} from '../helpers';

export function fromImg() {
    return function imgToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'IMG') {
            return;
        }

        const payload = readImageAttributesFromNode(node);

        const cardSection = builder.createCardSection('image', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromFigure(options) {
    return function figureImgToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        const img = node.querySelector('img');
        const kgClass = node.className.match(/kg-width-(wide|full)/);
        const grafClass = node.className.match(/graf--layout(FillWidth|OutsetCenter)/);

        if (!img) {
            return;
        }

        const payload = readImageAttributesFromNode(img);

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
