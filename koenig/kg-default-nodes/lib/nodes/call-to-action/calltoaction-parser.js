import {rgbToHex} from '../../utils/rgb-to-hex';
import {readImageAttributesFromElement} from '../../utils/read-image-attributes-from-element.js';

export function parseCallToActionNode(CallToActionNode) {
    return {
        div: (nodeElem) => {
            const isCallToActionElement = nodeElem.classList?.contains('kg-cta-card');
            if (isCallToActionElement) {
                return {
                    conversion(domNode) {
                        const div = domNode;
                        const layout = div.getAttribute('data-layout') || 'minimal';
                        const textValueElement = domNode.querySelector('.kg-cta-text');
                        const buttonElement = domNode.querySelector('.kg-cta-button');
                        const buttonStyles = buttonElement?.style || {};
                        const buttonColor = buttonStyles.backgroundColor || '#000000';
                        const buttonTextColor = buttonStyles.color || '#ffffff';
                        const sponsorLabelElement = domNode.querySelector('.kg-cta-sponsor-label');

                        const bgMatch = div.className.match(/kg-cta-bg-(\w+)/);
                        const backgroundColor = bgMatch ? bgMatch[1] : 'grey';

                        const imageContainer = domNode.querySelector('.kg-cta-image-container');
                        const imageElement = imageContainer?.querySelector('img');
                        let imageData = {
                            imageUrl: '',
                            imageWidth: null,
                            imageHeight: null
                        };
                        if (imageElement) {
                            const {src, width, height} = readImageAttributesFromElement(imageElement);
                            imageData.imageUrl = src;
                            imageData.imageWidth = width || null;
                            imageData.imageHeight = height || null;
                        }
                        const payload = {
                            layout: layout,
                            textValue: textValueElement.textContent.trim() || '',
                            showButton: buttonElement ? true : false,
                            buttonText: buttonElement?.textContent.trim() || '',
                            buttonUrl: buttonElement?.getAttribute('href'),
                            buttonColor: rgbToHex(buttonColor),
                            buttonTextColor: rgbToHex(buttonTextColor),
                            hasSponsorLabel: sponsorLabelElement ? true : false,
                            sponsorLabel: sponsorLabelElement?.innerHTML.trim() || '',
                            backgroundColor: backgroundColor,
                            imageUrl: imageData.imageUrl,
                            imageWidth: imageData.imageWidth,
                            imageHeight: imageData.imageHeight
                        };

                        const node = new CallToActionNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }
            return null;
        }
    };
}
