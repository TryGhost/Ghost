import {addCreateDocumentOption} from '../../../../utils/add-create-document-option';
import {renderEmptyContainer} from '../../../../utils/render-empty-container';
import {slugify} from '../../../../utils/slugify';

export function renderHeaderNodeV1(node, options = {}) {
    addCreateDocumentOption(options);

    const document = options.createDocument();

    if (!node.header && !node.subheader && (!node.buttonEnabled || (!node.buttonUrl || !node.buttonText))) {
        return renderEmptyContainer(document);
    }

    const templateData = {
        size: node.size,
        style: node.style,
        buttonEnabled: node.buttonEnabled && Boolean(node.buttonUrl) && Boolean(node.buttonText),
        buttonUrl: node.buttonUrl,
        buttonText: node.buttonText,
        header: node.header,
        headerSlug: slugify(node.header),
        subheader: node.subheader,
        subheaderSlug: slugify(node.subheader),
        hasHeader: !!node.header,
        hasSubheader: !!node.subheader && !!node.subheader.replace(/(<br>)+$/g).trim(),
        backgroundImageStyle: node.style === 'image' ? `background-image: url(${node.backgroundImageSrc})` : '',
        backgroundImageSrc: node.backgroundImageSrc
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

    return {element: div};
}
