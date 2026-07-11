import {addCreateDocumentOption} from '../../../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../../../export-dom.js';
import {getFirstHtmlElement} from '../../../../utils/get-first-html-element.js';
import {renderEmailButton} from '../../../../utils/render-helpers/email-button.js';
import {slugify} from '../../../../utils/slugify.js';
import {getSrcsetAttribute, type ImageRenderOptions} from '../../../../utils/srcset-attribute.js';

// TODO: nodeData.buttonTextColor should be calculated on the fly here rather than hardcoded by the editor

interface HeaderV2NodeData {
    alignment: string;
    buttonText: string;
    buttonEnabled: boolean;
    buttonUrl: string;
    header: string;
    subheader: string;
    backgroundImageSrc: string;
    backgroundImageWidth: number | null;
    backgroundImageHeight: number | null;
    backgroundSize: string;
    backgroundColor: string;
    buttonColor: string;
    layout: string;
    textColor: string;
    buttonTextColor: string;
    swapped: boolean;
    accentColor: string;
}

interface HeaderV2DatasetNode {
    __alignment: string;
    __buttonText: string;
    __buttonEnabled: boolean;
    __buttonUrl: string;
    __header: string;
    __subheader: string;
    __backgroundImageSrc: string;
    __backgroundImageWidth: number | null;
    __backgroundImageHeight: number | null;
    __backgroundSize: string;
    __backgroundColor: string;
    __buttonColor: string;
    __layout: string;
    __textColor: string;
    __buttonTextColor: string;
    __swapped: boolean;
    __accentColor: string;
}

interface HeaderV2RenderOptions extends ExportDOMOptions {
    design?: { buttonStyle?: 'fill' | 'outline' };
}

function cardTemplate(nodeData: HeaderV2NodeData, options: HeaderV2RenderOptions = {}) {
    const cardClasses = getCardClasses(nodeData).join(' ');

    const backgroundAccent = nodeData.backgroundColor === 'accent' ? 'kg-style-accent' : '';
    const buttonAccent = nodeData.buttonColor === 'accent' ? 'kg-style-accent' : '';
    const buttonStyle = nodeData.buttonColor !== 'accent' ? `background-color: ${nodeData.buttonColor};` : ``;
    const alignment = nodeData.alignment === 'center' ? 'kg-align-center' : '';
    const backgroundImageStyle = nodeData.backgroundColor !== 'accent' && (!nodeData.backgroundImageSrc || nodeData.layout === 'split') ? `background-color: ${nodeData.backgroundColor}` : '';

    let imgTemplate = '';
    if (nodeData.backgroundImageSrc) {
        const bgImage = {
            src: nodeData.backgroundImageSrc,
            width: nodeData.backgroundImageWidth,
            height: nodeData.backgroundImageHeight
        };

        const srcsetValue = getSrcsetAttribute({
            src: bgImage.src,
            width: bgImage.width as number,
            options: options as ImageRenderOptions
        });
        const srcset = srcsetValue ? `srcset="${srcsetValue}"` : '';

        imgTemplate = `
            <picture><img class="kg-header-card-image" src="${bgImage.src}" ${srcset} loading="lazy" alt="" /></picture>
        `;
    }

    const header = () => {
        if (nodeData.header) {
            return `<h2 id="${slugify(nodeData.header)}" class="kg-header-card-heading" style="color: ${nodeData.textColor};" data-text-color="${nodeData.textColor}">${nodeData.header}</h2>`;
        }
        return '';
    };

    const subheader = () => {
        if (nodeData.subheader) {
            return `<p id="${slugify(nodeData.subheader)}" class="kg-header-card-subheading" style="color: ${nodeData.textColor};" data-text-color="${nodeData.textColor}">${nodeData.subheader}</p>`;
        }
        return '';
    };

    const button = () => {
        if (nodeData.buttonEnabled && nodeData.buttonUrl && nodeData.buttonUrl.trim() !== '') {
            return `<a href="${nodeData.buttonUrl}" class="kg-header-card-button ${buttonAccent}" style="${buttonStyle}color: ${nodeData.buttonTextColor};" data-button-color="${nodeData.buttonColor}" data-button-text-color="${nodeData.buttonTextColor}">${nodeData.buttonText}</a>`;
        }
        return '';
    };

    const wrapperStyle = backgroundImageStyle ? `style="${backgroundImageStyle};"` : '';

    return `
        <div class="${cardClasses} ${backgroundAccent}" ${wrapperStyle} data-background-color="${nodeData.backgroundColor}">
            ${nodeData.layout !== 'split' ? imgTemplate : ''}
            <div class="kg-header-card-content">
                ${nodeData.layout === 'split' ? imgTemplate : ''}
                <div class="kg-header-card-text ${alignment}">
                    ${header()}
                    ${subheader()}
                    ${button()}
                </div>
            </div>
        </div>
        `;
}

function generateMSOSplitHeaderImage(nodeData: HeaderV2NodeData) {
    const {backgroundSize, backgroundImageSrc, backgroundColor} = nodeData;

    if (backgroundSize === 'contain') {
        return `
            <!--[if mso]>
                <v:rect xmlns:v="urn:schemas-microsoft-com:vml" stroke="false" style="width:600px;height:320px;">
                    <v:fill type="frame" aspect="atmost" size="225pt,120pt" src="${backgroundImageSrc}" color="${backgroundColor}" />
                    <v:textbox inset="0,0,0,0">
                    </v:textbox>
                </v:rect>
            <![endif]-->
            `;
    } else {
        return `
            <!--[if mso]>
                <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:320px;">
                    <v:fill type="frame" aspect="atleast" src="${backgroundImageSrc}" color="${backgroundColor}" />
                    <v:textbox inset="0,0,0,0">
                    </v:textbox>
                </v:rect>
            <![endif]-->
            `;
    }
}

function generateMSOContentWrapper(nodeData: HeaderV2NodeData) {
    const {backgroundImageSrc, backgroundColor} = nodeData;
    const hasContainAndSplit = nodeData.backgroundSize === 'contain' && nodeData.layout === 'split';
    const hasImageWithoutSplit = nodeData.backgroundImageSrc && nodeData.layout !== 'split';

    // Outlook clients will return the first td, all other clients will return the second td
    const msoOpenTag = `
                    <!--[if mso]>
                        <td class="kg-header-card-content" style="${hasImageWithoutSplit ? 'padding: 0;' : 'padding: 40px;'}${hasContainAndSplit ? 'padding-top: 0;' : ''}">
                    <![endif]-->
                    <!--[if !mso]><!-->
                        <td class="kg-header-card-content" style="${hasContainAndSplit ? 'padding-top: 0;' : ''}">
                    <!--<![endif]-->
                    `;

    const msoImageVML = hasImageWithoutSplit ? `
                    <!--[if mso]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                            <v:fill src="${backgroundImageSrc}" color="${backgroundColor}" type="frame" aspect="atleast" focusposition="0.5,0.5" />
                            <v:textbox inset="30pt,30pt,30pt,30pt" style="mso-fit-shape-to-text:true;">
                    <![endif]-->
                    ` : '';

    return msoOpenTag + msoImageVML;
}

function generateMSOContentClosing(nodeData: HeaderV2NodeData) {
    const hasImageWithoutSplit = nodeData.backgroundImageSrc && nodeData.layout !== 'split';

    if (!hasImageWithoutSplit) {
        return '';
    }

    return `
        <!--[if mso]>
            </v:textbox>
        </v:rect>
        <![endif]-->
        `;
}

function emailTemplate(nodeData: HeaderV2NodeData, options: HeaderV2RenderOptions) {
    const backgroundAccent = nodeData.backgroundColor === 'accent' ? `background-color: ${nodeData.accentColor};` : '';
    const alignment = nodeData.alignment === 'center' ? 'text-align: center;' : '';
    const backgroundImageStyle = nodeData.backgroundImageSrc ? (nodeData.layout !== 'split' ? `background-image: url(${nodeData.backgroundImageSrc}); background-size: cover; background-position: center center;` : `background-color: ${nodeData.backgroundColor};`) : `background-color: ${nodeData.backgroundColor};`;
    const splitImageStyle = `background-image: url(${nodeData.backgroundImageSrc}); background-size: ${nodeData.backgroundSize !== 'contain' ? 'cover' : '50%'}; background-position: center`;

    const showButton = nodeData.buttonEnabled && nodeData.buttonUrl && nodeData.buttonUrl.trim() !== '';

    const buttonHtml = renderEmailButton({
        url: nodeData.buttonUrl,
        text: nodeData.buttonText,
        alignment: nodeData.alignment,
        color: nodeData.buttonColor,
        style: options?.design?.buttonStyle
    });

    const hasDarkBg = nodeData.textColor?.toLowerCase() === '#ffffff';

    return (
        `
        <div class="kg-header-card kg-v2 ${hasDarkBg ? 'kg-header-card-dark-bg' : 'kg-header-card-light-bg'}" style="color:${nodeData.textColor}; ${alignment} ${backgroundImageStyle} ${backgroundAccent}">
            ${nodeData.layout === 'split' && nodeData.backgroundImageSrc ? `
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td background="${nodeData.backgroundImageSrc}" style="${splitImageStyle}" class="kg-header-card-image" bgcolor="${nodeData.backgroundColor}" align="center">
                            ${generateMSOSplitHeaderImage(nodeData) /* mso-only img, no shared markup */}
                        </td>
                    </tr>
                </table>
            ` : ''}
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="color:${nodeData.textColor}; ${alignment} ${backgroundImageStyle} ${backgroundAccent}">
                <tr>
                    ${generateMSOContentWrapper(nodeData) /* creates correct opening td tag for any platform */}
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td align="${nodeData.alignment}">
                                    <h2 class="kg-header-card-heading" style="color:${nodeData.textColor};">${nodeData.header}</h2>
                                </td>
                            </tr>
                            <tr>
                                <td class="kg-header-card-subheading-wrapper" align="${nodeData.alignment}">
                                    <p class="kg-header-card-subheading" style="color:${nodeData.textColor};">${nodeData.subheader}</p>
                                </td>
                            </tr>
                            <tr>
                                ${showButton ? `
                                    <td class="kg-header-button-wrapper">
                                        ${buttonHtml}
                                    </td>
                                ` : ''}
                            </tr>
                        </table>
                ${generateMSOContentClosing(nodeData) /* mso-only closing tags, no shared markup */}
                    </td>
                </tr>
            </table>
        </div>
        `
    );
}

export function renderHeaderNodeV2(dataset: HeaderV2DatasetNode, options: HeaderV2RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    const node = {
        alignment: dataset.__alignment,
        buttonText: dataset.__buttonText,
        buttonEnabled: dataset.__buttonEnabled,
        buttonUrl: dataset.__buttonUrl,
        header: dataset.__header,
        subheader: dataset.__subheader,
        backgroundImageSrc: dataset.__backgroundImageSrc,
        backgroundImageWidth: dataset.__backgroundImageWidth,
        backgroundImageHeight: dataset.__backgroundImageHeight,
        backgroundSize: dataset.__backgroundSize,
        backgroundColor: dataset.__backgroundColor,
        buttonColor: dataset.__buttonColor,
        layout: dataset.__layout,
        textColor: dataset.__textColor,
        buttonTextColor: dataset.__buttonTextColor,
        swapped: dataset.__swapped,
        accentColor: dataset.__accentColor
    };

    if (options.target === 'email') {
        const emailDoc = options.createDocument!();
        const emailDiv = emailDoc.createElement('div');

        emailDiv.innerHTML = emailTemplate(node, options)?.trim();

        return {element: getFirstHtmlElement(emailDiv, 'renderHeaderV2Node email') as HTMLDivElement, type: 'outer' as const};
    }

    const htmlString = cardTemplate(node, options);

    const element = document.createElement('div');
    element.innerHTML = htmlString?.trim();

    if (node.header === '') {
        const h2Element = element.querySelector('.kg-header-card-heading');
        if (h2Element) {
            h2Element.remove();
        }
    }

    if (node.subheader === '') {
        const pElement = element.querySelector('.kg-header-card-subheading');
        if (pElement) {
            pElement.remove();
        }
    }

    return {element: getFirstHtmlElement(element, 'renderHeaderV2Node') as HTMLDivElement, type: 'outer' as const};
}

export function getCardClasses(nodeData: HeaderV2NodeData) {
    const cardClasses = ['kg-card kg-header-card kg-v2'];

    if (nodeData.layout && nodeData.layout !== 'split') {
        cardClasses.push(`kg-width-${nodeData.layout}`);
    }

    if (nodeData.layout === 'split') {
        cardClasses.push('kg-layout-split kg-width-full');
    }

    if (nodeData.swapped && nodeData.layout === 'split') {
        cardClasses.push('kg-swapped');
    }

    if (nodeData.layout && nodeData.layout === 'full') {
        cardClasses.push(`kg-content-wide`);
    }

    if (nodeData.layout === 'split') {
        if (nodeData.backgroundSize === 'contain') {
            cardClasses.push('kg-content-wide');
        }
    }

    return cardClasses;
}
