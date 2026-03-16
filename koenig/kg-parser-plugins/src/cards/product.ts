import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

function getButtonText(node: Element): string {
    let buttonText = node.textContent;
    if (buttonText) {
        buttonText = buttonText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return buttonText || '';
}

export function fromKoenigCard(): ParserPlugin {
    return function kgButtonCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-product-card')) {
            return;
        }

        const el = node as Element;
        const titleNode = el.querySelector('.kg-product-card-title');
        const descriptionNode = el.querySelector('.kg-product-card-description');

        const title = titleNode && titleNode.innerHTML.trim();
        const description = descriptionNode && descriptionNode.innerHTML.trim();

        if (!title && !description) {
            return;
        }

        const payload: Record<string, unknown> = {
            productButtonEnabled: false,
            productRatingEnabled: false,
            productTitle: title,
            productDescription: description
        };

        const img = el.querySelector('.kg-product-card-image');
        if (img && img.getAttribute('src')) {
            payload.productImageSrc = img.getAttribute('src');
        }

        const stars = [...el.querySelectorAll('.kg-product-card-rating-active')].length;
        if (stars) {
            payload.productRatingEnabled = true;
            payload.productStarRating = stars;
        }

        const button = el.querySelector('a') as HTMLAnchorElement | null;
        if (button) {
            const buttonUrl = button.href;
            const buttonText = getButtonText(button);

            if (buttonUrl && buttonText) {
                payload.productButtonEnabled = true;
                payload.productButton = buttonText;
                payload.productUrl = buttonUrl;
            }
        }

        const cardSection = builder.createCardSection('product', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
