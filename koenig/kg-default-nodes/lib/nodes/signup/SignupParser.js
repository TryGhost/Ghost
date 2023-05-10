export class SignupParser {
    constructor(NodeClass) {
        this.NodeClass = NodeClass;
    }
  
    get DOMConversionMap() {
        const self = this;
  
        return {
            form: (nodeElem) => {
                const isSignupNode = nodeElem.dataset?.membersForm === '';
                if (nodeElem.tagName === 'FORM' && isSignupNode) {
                    return {
                        conversion(domNode) {
                            const style = domNode.getAttribute('style')?.includes('background-image')
                                ? 'image'
                                : 'default';
                            const buttonText = domNode.querySelector('button')?.textContent || 'Continue';
                            const header = domNode.querySelector('h1')?.textContent || '';
                            const subheader = domNode.querySelector('h2')?.textContent || '';
                            const disclaimer = domNode.querySelector('p')?.textContent || '';
                            const backgroundImageSrc = domNode.getAttribute('style')?.match(/url\((.+)\)/)?.[1] || '';
  
                            const payload = {
                                style,
                                buttonText,
                                header,
                                subheader,
                                disclaimer,
                                backgroundImageSrc
                            };
  
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
