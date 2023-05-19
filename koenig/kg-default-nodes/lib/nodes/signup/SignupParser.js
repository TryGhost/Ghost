function rgbToHex(rgb) {
    try {
        // Extract the red, green, and blue values from the RGB string
        const [r, g, b] = rgb.match(/\d+/g);
        // Convert each component to hexadecimal
        const red = parseInt(r, 10).toString(16).padStart(2, '0');
        const green = parseInt(g, 10).toString(16).padStart(2, '0');
        const blue = parseInt(b, 10).toString(16).padStart(2, '0');
        // Concatenate the hexadecimal values
        const hex = `#${red}${green}${blue}`;
        return hex;
    } catch (e) {
        return null;
    }
}

export class SignupParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }
  
    get DOMConversionMap() {
        const self = this;
  
        return {
            div: (nodeElem) => {
                const isSignupNode = nodeElem.dataset?.lexicalSignupForm === '';
                if (nodeElem.tagName === 'DIV' && isSignupNode) {
                    return {
                        conversion(domNode) {
                            const style = domNode.getAttribute('style')?.includes('background-image')
                                ? 'image'
                                : 'default';
                            const buttonText = domNode.querySelector('button')?.textContent || 'Continue';
                            const header = domNode.querySelector('h2')?.textContent || '';
                            const subheader = domNode.querySelector('h3')?.textContent || '';
                            const disclaimer = domNode.querySelector('p')?.textContent || '';
                            const backgroundImageSrc = domNode.getAttribute('style')?.match(/url\((.+)\)/)?.[1] || '';
                            const backgroundColor = domNode.querySelector('.kg-signup-card-container')?.style.backgroundColor || '';
                            const buttonColor = domNode.querySelector('.kg-signup-card-button')?.style.backgroundColor || '';
                            const textColor = domNode.querySelector('.kg-signup-card-heading')?.style.color || '';
                            const buttonTextColor = domNode.querySelector('.kg-signup-card-button')?.style.color || '';
                            const alignment = domNode.querySelector('.kg-signup-card-container')?.classList.contains('align-center') ? 'center' : 'left';
  
                            const payload = {
                                style,
                                buttonText,
                                header,
                                subheader,
                                disclaimer,
                                backgroundImageSrc,
                                backgroundColor: rgbToHex(backgroundColor) || 'accent',
                                buttonColor: rgbToHex(buttonColor) || '#ffffff',
                                textColor: rgbToHex(textColor) || '#ffffff',
                                buttonTextColor: rgbToHex(buttonTextColor) || '#000000',
                                alignment
                            };

                            console.log(payload);
  
                            const node = new self.NodeClass(payload);
                            return {node};
                        },
                        priority: 1
                    };
                }
                return null;
            }
        };
    }
}
