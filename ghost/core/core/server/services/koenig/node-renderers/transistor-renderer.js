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
    // SVG logo with white icon on colored rounded square background
    // The icon is the Transistor logo (circle with vertical and horizontal lines)
    const transistorLogo = 'data:image/svg+xml,' + encodeURIComponent(`<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg"><rect width="56" height="56" rx="8" fill="${accentColor}"/><g fill="none" stroke="#ffffff" stroke-width="3.5" transform="translate(28, 28)"><circle cx="0" cy="0" r="18"/><line x1="0" y1="-14" x2="0" y2="14"/><line x1="-14" y1="0" x2="-4" y2="0"/><line x1="4" y1="0" x2="14" y2="0"/></g></svg>`);

    // Use {uuid} replacement string - wrapReplacementStrings converts this to %%{uuid}%%
    // which gets replaced with actual member UUID when email is sent to each recipient
    const transistorUrl = 'https://partner.transistor.fm/ghost/{uuid}';

    const cardHtml = html`
        <table class="kg-card kg-transistor-card" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 1.5em 0; border-radius: 8px; border: 1px solid #e5eff5;">
            <tr>
                <td style="padding: 12px;">
                    <table cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                            <td valign="middle" width="56" style="padding-right: 12px;">
                                <a href="${transistorUrl}" style="text-decoration: none;">
                                    <img src="${transistorLogo}"
                                         width="56" height="56"
                                         alt="Transistor"
                                         style="border-radius: 8px; display: block;">
                                </a>
                            </td>
                            <td valign="middle" style="vertical-align: middle;">
                                <a href="${transistorUrl}"
                                   style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 600; text-decoration: none; color: #15212A; font-size: 15px; line-height: 1.3em; display: block;">
                                    Listen to your podcasts
                                </a>
                                <a href="${transistorUrl}"
                                   style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #738a94; font-size: 13px; text-decoration: none; line-height: 1.4em; display: block; margin-top: 1px;">
                                    Subscribe in your favorite podcast app or connect using your private RSS feed.
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
