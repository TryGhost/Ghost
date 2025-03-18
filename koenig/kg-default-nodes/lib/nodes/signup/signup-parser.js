import {rgbToHex} from '../../utils/rgb-to-hex';

function getLayout(domNode) {
    if (domNode.classList.contains('kg-layout-split')) {
        return 'split';
    } else if (domNode.classList.contains('kg-layout-full')) {
        return 'full';
    } else if (domNode.classList.contains('kg-layout-wide')) {
        return 'wide';
    } else {
        return 'regular';
    }
}

export function signupParser(SignupNode) {
    return {
        div: (nodeElem) => {
            const isSignupNode = nodeElem.dataset?.lexicalSignupForm === '';
            if (nodeElem.tagName === 'DIV' && isSignupNode) {
                return {
                    conversion(domNode) {
                        const layout = getLayout(domNode);
                        const header = domNode.querySelector('h2')?.textContent || '';
                        const subheader = domNode.querySelector('h3')?.textContent || '';
                        const disclaimer = domNode.querySelector('p')?.textContent || '';
                        const backgroundImageSrc = domNode.querySelector('.kg-signup-card-image')?.getAttribute('src');
                        const backgroundColor = domNode.style.backgroundColor || '';
                        const buttonColor = domNode.querySelector('.kg-signup-card-button')?.style.backgroundColor || '';
                        const buttonText = domNode.querySelector('.kg-signup-card-button-default')?.textContent?.trim() || 'Subscribe';
                        const buttonTextColor = domNode.querySelector('.kg-signup-card-button')?.style.color || '';
                        const textColor = domNode.querySelector('.kg-signup-card-success')?.style.color || '';
                        const alignment = domNode.querySelector('.kg-signup-card-text')?.classList.contains('kg-align-center') ? 'center' : 'left';
                        const successMessage = domNode.querySelector('.kg-signup-card-success')?.textContent?.trim() || '';
                        const labels = [...domNode.querySelectorAll('input[data-members-label]')].map(input => input.value);

                        const isAccentBackground = domNode.classList?.contains('kg-style-accent') ?? false;
                        const isAccentButton = domNode.querySelector('.kg-signup-card-button')?.classList?.contains('kg-style-accent') ?? false;

                        const isSwapped = domNode.classList.contains('kg-swapped');
                        const backgroundSize = domNode.classList.contains('kg-content-wide') ? 'contain' : 'cover';

                        const payload = {
                            layout,
                            buttonText,
                            header,
                            subheader,
                            disclaimer,
                            backgroundImageSrc,
                            backgroundSize,
                            backgroundColor: isAccentBackground ? 'accent' : (rgbToHex(backgroundColor) || '#ffffff'),
                            buttonColor: isAccentButton ? 'accent' : (rgbToHex(buttonColor) || '#ffffff'),
                            textColor: rgbToHex(textColor) || '#ffffff',
                            buttonTextColor: rgbToHex(buttonTextColor) || '#000000',
                            alignment,
                            successMessage,
                            labels,
                            swapped: isSwapped
                        };

                        const node = new SignupNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }
            return null;
        }
    };
}
