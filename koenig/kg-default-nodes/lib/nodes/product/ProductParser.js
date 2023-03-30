import {readCaptionFromElement} from '../../utils/read-caption-from-element';

export class ProductParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }

    get DOMConversionMap() {
        const self = this;

        return {
            div: () => ({
                conversion(domNode) {
                    const isKgProductCard = domNode.classList?.contains('kg-product-card');
                    if (domNode.tagName === 'DIV' && isKgProductCard) {
                        const title = readCaptionFromElement(domNode, {selector: '.kg-product-card-title'});
                        const description = readCaptionFromElement(domNode, {selector: '.kg-product-card-description'});

                        const payload = {
                            isButtonEnabled: false,
                            isRatingEnabled: false,
                            title: title,
                            description: description
                        };

                        const img = domNode.querySelector('.kg-product-card-image');
                        if (img && img.getAttribute('src')) {
                            payload.imgSrc = img.getAttribute('src');

                            if (img.getAttribute('width')) {
                                payload.imgWidth = img.getAttribute('width');
                            }

                            if (img.getAttribute('height')) {
                                payload.imgHeight = img.getAttribute('height');
                            }
                        }

                        const stars = [...domNode.querySelectorAll('.kg-product-card-rating-active')].length;
                        if (stars) {
                            payload.isRatingEnabled = true;
                            payload.starRating = stars;
                        }

                        const button = domNode.querySelector('a');

                        if (button) {
                            const buttonUrl = button.href;
                            const buttonText = getButtonText(button);

                            if (buttonUrl && buttonText) {
                                payload.isButtonEnabled = true;
                                payload.buttonText = buttonText;
                                payload.buttonUrl = buttonUrl;
                            }
                        }

                        if (!title && !description && !img && !button) {
                            return null;
                        }

                        const node = new self.NodeClass(payload);
                        return {node};
                    }

                    return null;
                },
                priority: 1
            })
        };
    }
}

function getButtonText(node) {
    let buttonText = node.textContent;
    if (buttonText) {
        buttonText = buttonText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return buttonText;
}
