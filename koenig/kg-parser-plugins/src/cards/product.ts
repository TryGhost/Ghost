function getButtonText(node) {
    let buttonText = node.textContent;
    if (buttonText) {
        buttonText = buttonText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return buttonText;
}

export function fromKoenigCard() {
    return function kgButtonCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-product-card')) {
            return;
        }

        const titleNode = node.querySelector('.kg-product-card-title');
        const descriptionNode = node.querySelector('.kg-product-card-description');
        const title = titleNode && titleNode.innerHTML.trim();
        const description = descriptionNode && descriptionNode.innerHTML.trim();

        if (!title && !description) {
            return;
        }

        const payload = {
            productButtonEnabled: false,
            productRatingEnabled: false,

            productTitle: title,
            productDescription: description
        };

        const img = node.querySelector('.kg-product-card-image');
        if (img && img.getAttribute('src')) {
            payload.productImageSrc = img.getAttribute('src');
        }

        const stars = [...node.querySelectorAll('.kg-product-card-rating-active')].length;
        if (stars) {
            payload.productRatingEnabled = true;
            payload.productStarRating = stars;
        }

        const button = node.querySelector('a');

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
