export function fromKoenigCard() {
    return function kgHeaderCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-header-card')) {
            return;
        }

        const headerNode = node.querySelector('.kg-header-card-header');
        const subheaderNode = node.querySelector('.kg-header-card-subheader');
        const buttonNode = node.querySelector('.kg-header-card-button');

        let header = '';
        let subheader = '';
        let buttonText = '';
        let buttonUrl = '';

        if (headerNode) {
            header = headerNode.innerHTML.trim();
        }
        if (subheaderNode) {
            subheader = subheaderNode.innerHTML.trim();
        }

        if (buttonNode) {
            buttonText = buttonNode.textContent.trim();
            buttonUrl = buttonNode.getAttribute('href').trim();
        }

        if (!header && !subheader && (!buttonNode || !buttonText || !buttonUrl)) {
            return;
        }

        const classes = [...node.classList];
        let backgroundImageSrc = '';
        if (node.getAttribute('data-kg-background-image')) {
            backgroundImageSrc = node.getAttribute('data-kg-background-image').trim();
        }

        const payload = {
            header,
            subheader,
            buttonEnabled: Boolean(buttonNode),
            buttonText,
            buttonUrl,
            backgroundImageSrc,
            size: 'small',
            style: 'dark'
        };

        const sizeClass = classes.find(c => /^kg-size-(small|medium|large)$/.test(c));
        const styleClass = classes.find(c => /^kg-style-(dark|light|accent|image)$/.test(c));
        if (sizeClass) {
            payload.size = sizeClass.replace('kg-size-', '');
        }
        if (styleClass) {
            payload.style = styleClass.replace('kg-style-', '');
        }

        const cardSection = builder.createCardSection('header', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
