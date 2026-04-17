export function parseHeaderNode(HeaderNode) {
    return {
        div: (nodeElem) => {
            const isHeaderCardv1 = nodeElem.classList?.contains('kg-header-card') && !nodeElem.classList?.contains('kg-v2');
            const isHeaderCardv2 = nodeElem.classList?.contains('kg-header-card') && nodeElem.classList?.contains('kg-v2');
            // v1 parser
            if (nodeElem.tagName === 'DIV' && isHeaderCardv1) {
                return {
                    conversion(domNode) {
                        const div = domNode;
                        const headerElement = domNode.querySelector('.kg-header-card-header');
                        const subheaderElement = domNode.querySelector('.kg-header-card-subheader');
                        const buttonElement = domNode.querySelector('.kg-header-card-button');
                        const size = div.classList.contains('kg-size-large') ? 'large' : 'small';
                        const style = div.classList.contains('kg-style-image') ? 'image' : 'text';
                        const backgroundImageSrc = div.getAttribute('data-kg-background-image');
                        const hasHeader = !!headerElement;
                        const header = hasHeader ? headerElement.textContent : '';
                        const hasSubheader = !!subheaderElement;
                        const subheader = hasSubheader ? subheaderElement.textContent : '';
                        const buttonEnabled = !!buttonElement;
                        const buttonUrl = buttonEnabled ? buttonElement.getAttribute('href') : '';
                        const buttonText = buttonEnabled ? buttonElement.textContent : '';

                        const payload = {
                            size,
                            style,
                            backgroundImageSrc,
                            header,
                            subheader,
                            buttonEnabled,
                            buttonUrl,
                            buttonText,
                            version: 1
                        };

                        const node = new HeaderNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }

            // V2 parser
            if (nodeElem.tagName === 'DIV' && isHeaderCardv2) {
                return {
                    conversion(domNode) {
                        const div = domNode;
                        const headerElement = div.querySelector('.kg-header-card-heading');
                        const subheaderElement = div.querySelector('.kg-header-card-subheading');
                        const buttonElement = div.querySelector('.kg-header-card-button');
                        const alignment = div.classList.contains('kg-align-center') ? 'center' : '';
                        const backgroundImageSrc = div.querySelector('.kg-header-card-image')?.getAttribute('src');
                        const layout = backgroundImageSrc ? 'split' : '';
                        const backgroundColor = div.classList.contains('kg-style-accent') ? 'accent' : div.getAttribute('data-background-color');
                        const buttonColor = buttonElement?.getAttribute('data-button-color') || '';
                        const textColor = headerElement?.getAttribute('data-text-color') || '';
                        const buttonTextColor = buttonElement?.getAttribute('data-button-text-color') || '';
                        const header = headerElement?.textContent || '';
                        const subheader = subheaderElement?.textContent || '';
                        const buttonEnabled = !!buttonElement;
                        const buttonUrl = buttonEnabled ? buttonElement.getAttribute('href') : '';
                        const buttonText = buttonEnabled ? buttonElement.textContent : '';

                        const payload = {
                            backgroundColor,
                            buttonColor,
                            alignment,
                            backgroundImageSrc,
                            layout,
                            textColor,
                            header,
                            subheader,
                            buttonEnabled,
                            buttonUrl,
                            buttonText,
                            buttonTextColor,
                            version: 2
                        };

                        const node = new HeaderNode(payload);
                        return {node};
                    },
                    priority: 1
                };
            }
            return null;
        }
    };
}
