const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');
const {renderWithVisibility} = require('../render-utils/visibility');
const {wrapReplacementStrings} = require('../render-utils/replacement-strings');
const {html} = require('../render-utils/tagged-template-fns');

function renderTransistorNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    if (options.target === 'email') {
        return emailTemplate(node, document, options);
    }
    return frontendTemplate(node, document, options);
}

function frontendTemplate(node, document, options) {
    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-transistor-card');
    const memberUuid = options.memberUuid;

    if (!memberUuid) {
        // Transistor does not support public/non-member embeds for now, so we return null
        return null;
    }

    const embedUrl = new URL(`https://partner.transistor.fm/ghost/embed/${memberUuid}`);

    if (node.accentColor) {
        embedUrl.searchParams.set('color', node.accentColor.replace(/^#/, ''));
    }
    if (node.backgroundColor) {
        embedUrl.searchParams.set('background', node.backgroundColor.replace(/^#/, ''));
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '400');
    iframe.setAttribute('title', 'Transistor podcasts');
    iframe.setAttribute('frameborder', 'no');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('seamless', '');
    iframe.setAttribute('src', embedUrl.toString());
    iframe.setAttribute('data-kg-transistor-embed', '');

    figure.appendChild(iframe);

    return renderWithVisibility({element: figure}, node.visibility, options);
}

function emailTemplate(node, document, options) {
    const accentColor = node.accentColor || '#15171A';
    const transistorLogo = 'data:image/svg+xml,' + encodeURIComponent(`<svg viewBox="5 0.5 144 144" xmlns="http://www.w3.org/2000/svg"><g fill="${accentColor}"><path d="M77 120.3c-2.6 0-4.8-2.1-4.8-4.8V29.4c0-2.6 2.1-4.8 4.8-4.8s4.8 2.1 4.8 4.8v86.2c0 2.6-2.2 4.7-4.8 4.7z"/><path d="M57 77.3H34c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.1 4.8-4.8 4.8z"/><path d="M120.1 77.3h-23c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.2 4.8-4.8 4.8z"/><path d="M77 144.5c-39.7 0-72-32.3-72-72s32.3-72 72-72 72 32.3 72 72-32.3 72-72 72zM77 10c-34.4 0-62.4 28-62.4 62.4 0 34.4 28 62.4 62.4 62.4 34.4 0 62.4-28 62.4-62.4C139.4 38 111.4 10 77 10z"/></g></svg>`);

    // Use {uuid} replacement string - wrapReplacementStrings converts this to %%{uuid}%%
    // which gets replaced with actual member UUID when email is sent to each recipient
    const transistorUrl = 'https://partner.transistor.fm/ghost/{uuid}';

    const cardHtml = html`
        <table class="kg-card kg-transistor-card" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="center" style="padding: 24px 0; text-align: center;">
                    <a href="${transistorUrl}" style="text-decoration: none;">
                        <img src="${transistorLogo}"
                             width="56" height="56"
                             alt="Transistor"
                             style="border-radius: 8px; display: block; margin: 0 auto 12px auto;">
                    </a>
                    <a href="${transistorUrl}"
                       style="font-weight: 600; text-decoration: none; color: ${accentColor}; font-size: 16px; display: block;">
                        Listen on Transistor
                    </a>
                    <a href="${transistorUrl}"
                       style="color: #738a94; font-size: 14px; text-decoration: none; display: block; margin-top: 4px;">
                        Get your private podcast feed
                    </a>
                </td>
            </tr>
        </table>
    `;

    const wrappedHtml = wrapReplacementStrings(cardHtml);

    const container = document.createElement('div');
    container.innerHTML = wrappedHtml;

    return renderWithVisibility({element: container.firstElementChild}, node.visibility, options);
}

module.exports = renderTransistorNode;
