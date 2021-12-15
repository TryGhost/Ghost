import {addFigCaptionToPayload} from '../helpers';

export function fromKoenigCard(options) {
    return function kgBeforeAfterCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-before-after-card')) {
            return;
        }

        const cardWidth = node.classList.contains('kg-width-full') ? 'full' : 'wide';

        const images = node.querySelectorAll('img');

        const beforeImage = images[1];
        const afterImage = images[0];

        if (!beforeImage || !afterImage) {
            return;
        }

        const payload = {
            cardWidth,
            beforeImage: {
                width: beforeImage.width,
                src: beforeImage.src
            },
            afterImage: {
                width: afterImage.width,
                src: afterImage.src
            }
        };

        addFigCaptionToPayload(node, payload, {options});

        const cardSection = builder.createCardSection('before-after', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromJetpackCard(options) {
    return function jetpackJuxtaposeToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('wp-block-jetpack-image-compare')) {
            return;
        }

        const cardWidth = 'wide';

        const images = node.querySelectorAll('img');

        const beforeImage = images[0];
        const afterImage = images[1];

        if (!beforeImage || !afterImage) {
            return;
        }

        const payload = {
            cardWidth,
            beforeImage: {
                width: 1000,
                src: beforeImage.src
            },
            afterImage: {
                width: 1000,
                src: afterImage.src
            }
        };

        addFigCaptionToPayload(node, payload, {options});

        const cardSection = builder.createCardSection('before-after', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
