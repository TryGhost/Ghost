import {readCaptionFromElement} from '../../utils/read-caption-from-element';

export function parseProductNode(ProductNode) {
    return {
        div: (nodeElem) => {
            const isKgProductCard = nodeElem.classList?.contains('kg-product-card');
            if (nodeElem.tagName === 'DIV' && isKgProductCard) {
                return {
                    conversion(domNode) {
                        const title = readCaptionFromElement(domNode, {selector: '.kg-product-card-title'});
                        const description = readCaptionFromElement(domNode, {selector: '.kg-product-card-description'});

                        const payload = {
                            productButtonEnabled: false,
                            productRatingEnabled: false,
                            productTitle: title,
                            productDescription: description
                        };

                        const img = domNode.querySelector('.kg-product-card-image');
                        if (img && img.getAttribute('src')) {
                            payload.productImageSrc = img.getAttribute('src');

                            if (img.getAttribute('width')) {
                                payload.productImageWidth = img.getAttribute('width');
                            }

                            if (img.getAttribute('height')) {
                                payload.productImageHeight = img.getAttribute('height');
                            }
                        }

                        const stars = [...domNode.querySelectorAll('.kg-product-card-rating-active')].length;
                        if (stars) {
                            payload.productRatingEnabled = true;
                            payload.productStarRating = stars;
                        }

                        const button = domNode.querySelector('a');

                        if (button) {
                            const buttonUrl = button.getAttribute('href');
                            const buttonText = getButtonText(button);

                            if (buttonUrl && buttonText) {
                                payload.productButtonEnabled = true;
                                payload.productButton = buttonText;
                                payload.productUrl = buttonUrl;
                            }
                        }

                        if (!title && !description && !img && !button) {
                            return null;
                        }

                        const node = new ProductNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }
            return null;
        }
    };
}

function getButtonText(node) {
    let buttonText = node.textContent;
    if (buttonText) {
        buttonText = buttonText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return buttonText;
}
