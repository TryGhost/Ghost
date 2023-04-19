import {addCreateDocumentOption} from '../../utils/add-create-document-option';

function slugify(str) {
    // Remove any non-word character with whitespace
    str = str.replace(/[^\w\s]/gi, '');

    // Replace any whitespace character with a dash
    str = str.replace(/\s+/g, '-');

    // Convert to lowercase
    str = str.toLowerCase();

    return str;
}

export function renderHeaderNodeToDOM(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.getHeader() && !node.getSubheader() && (!node.getButtonEnabled() || (!node.getButtonUrl() || !node.getButtonText()))) {
        return document.createTextNode('');
    }

    const templateData = {
        size: node.getSize(),
        style: node.getStyle(),
        buttonEnabled: node.getButtonEnabled() && Boolean(node.getButtonUrl()) && Boolean(node.getButtonText()),
        buttonUrl: node.getButtonUrl(),
        buttonText: node.getButtonText(),
        header: node.getHeader(),
        headerSlug: slugify(node.getHeader()),
        subheader: node.getSubheader(),
        subheaderSlug: slugify(node.getSubheader()),
        hasHeader: node.getHasHeader(),
        hasSubheader: node.getHasSubheader(),
        backgroundImageStyle: node.getStyle() === 'image' ? `background-image: url(${node.getBackgroundImageSrc()})` : '',
        backgroundImageSrc: node.getBackgroundImageSrc()
    };

    const div = document.createElement('div');
    div.classList.add('kg-card', 'kg-header-card', 'kg-width-full', `kg-size-${templateData.size}`, `kg-style-${templateData.style}`);
    div.setAttribute('data-kg-background-image', templateData.backgroundImageSrc);
    div.setAttribute('style', templateData.backgroundImageStyle);

    if (templateData.hasHeader) {
        const headerElement = document.createElement('h2');
        headerElement.classList.add('kg-header-card-header');
        headerElement.setAttribute('id', templateData.headerSlug);
        headerElement.innerHTML = templateData.header;
        div.appendChild(headerElement);
    }

    if (templateData.hasSubheader) {
        const subheaderElement = document.createElement('h3');
        subheaderElement.classList.add('kg-header-card-subheader');
        subheaderElement.setAttribute('id', templateData.subheaderSlug);
        subheaderElement.innerHTML = templateData.subheader;
        div.appendChild(subheaderElement);
    }

    if (templateData.buttonEnabled) {
        const buttonElement = document.createElement('a');
        buttonElement.classList.add('kg-header-card-button');
        buttonElement.setAttribute('href', templateData.buttonUrl);
        buttonElement.textContent = templateData.buttonText;
        div.appendChild(buttonElement);
    }

    return div;
}
