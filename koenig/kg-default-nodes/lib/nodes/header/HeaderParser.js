export function parseHeaderNode(HeaderNode) {
    return {
        div: (nodeElem) => {
            const isHeaderCard = nodeElem.classList?.contains('kg-header-card');
            if (nodeElem.tagName === 'DIV' && isHeaderCard) {
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
                        const headerSlug = hasHeader ? headerElement.getAttribute('id') : '';
                        const hasSubheader = !!subheaderElement;
                        const subheader = hasSubheader ? subheaderElement.textContent : '';
                        const subheaderSlug = hasSubheader ? subheaderElement.getAttribute('id') : '';
                        const buttonEnabled = !!buttonElement;
                        const buttonUrl = buttonEnabled ? buttonElement.getAttribute('href') : '';
                        const buttonText = buttonEnabled ? buttonElement.textContent : '';

                        const payload = {
                            size,
                            style,
                            backgroundImageSrc,
                            header,
                            headerSlug,
                            subheader,
                            subheaderSlug,
                            buttonEnabled,
                            buttonUrl,
                            buttonText
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
