import {addCreateDocumentOption} from '../../../../utils/add-create-document-option.js';
import type {ExportDOMOptions, ExportDOMOutput} from '../../../../export-dom.js';
import {html} from '../../../../utils/tagged-template-fns.js';
import {renderEmptyContainer} from '../../../../utils/render-empty-container.js';
import {slugify} from '../../../../utils/slugify.js';

interface HeaderV1NodeData {
    size: string;
    style: string;
    buttonEnabled: boolean;
    buttonUrl: string;
    buttonText: string;
    header: string;
    subheader: string;
    backgroundImageSrc: string;
}

interface RenderOptions extends ExportDOMOptions {}

export function renderHeaderNodeV1(node: HeaderV1NodeData, options: RenderOptions = {}): ExportDOMOutput {
    addCreateDocumentOption(options);

    const document = options.createDocument!();

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
        hasSubheader: !!node.subheader && !!node.subheader.replace(/(<br\s*\/?>)+$/i, '').trim(),
        backgroundImageStyle: node.style === 'image' ? `background-image: url(${node.backgroundImageSrc})` : '',
        backgroundImageSrc: node.backgroundImageSrc
    };

    const headerHtml = html`
        <div
            class="kg-card kg-header-card kg-width-full kg-size-${templateData.size} kg-style-${templateData.style}"
            data-kg-background-image="${templateData.backgroundImageSrc}"
            style="${templateData.backgroundImageStyle}"
        >
            ${templateData.hasHeader && html`
                <h2 class="kg-header-card-header" id="${templateData.headerSlug}">
                    ${templateData.header}
                </h2>
            `}
            ${templateData.hasSubheader && html`
                <h3 class="kg-header-card-subheader" id="${templateData.subheaderSlug}">
                    ${templateData.subheader}
                </h3>
            `}
            ${templateData.buttonEnabled && html`
                <a class="kg-header-card-button" href="${templateData.buttonUrl}">
                    ${templateData.buttonText}
                </a>
            `}
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = headerHtml;

    return {element: div, type: 'inner' as const};
}
