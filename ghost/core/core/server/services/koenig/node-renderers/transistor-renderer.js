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

    // Use {uuid} placeholder - content.js will substitute with member UUID at request time
    const embedUrl = new URL(`https://partner.transistor.fm/ghost/embed/{uuid}`);

    if (node.accentColor) {
        embedUrl.searchParams.set('color', node.accentColor.replace(/^#/, ''));
    }
    if (node.backgroundColor) {
        embedUrl.searchParams.set('background', node.backgroundColor.replace(/^#/, ''));
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '325');
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
    // Use the site accent color from the newsletter/email design settings
    const accentColor = options.design?.accentColor || '#15171A';

    // Use {uuid} replacement string - wrapReplacementStrings converts this to %%{uuid}%%
    // which gets replaced with actual member UUID when email is sent to each recipient
    const transistorUrl = 'https://partner.transistor.fm/ghost/{uuid}';

    const cardHtml = html`
        <table class="kg-card kg-transistor-card" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding: 4px;">
                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td valign="middle" width="56" style="padding-right: 14px;">
                                <a href="${transistorUrl}" style="display: block; width: 52px; height: 52px; padding-top: 4px; padding-right: 4px; padding-bottom: 4px; padding-left: 4px; border-radius: 2px; background-color: ${accentColor}">
                                    <img src="https://static.ghost.org/v6.0.0/images/transistor-logo-ondark.png"
                                        width="36" height="36"
                                        alt="Transistor"
                                        style="width: 36px; height: 36px; padding: 8px;">
                                </a>
                            </td>
                            <td valign="middle" style="vertical-align: middle;">
                                <a href="${transistorUrl}" class="kg-transistor-title">
                                    Listen to your podcasts
                                </a>
                                <a href="${transistorUrl}"  class="kg-transistor-description">
                                    Subscribe and listen to your personal podcast feed in your favorite app.
                                </a>
                            </td>
                        </tr>
                    </table>
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
