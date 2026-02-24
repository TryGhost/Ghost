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

    if (options.siteUuid) {
        embedUrl.searchParams.set('ctx', options.siteUuid);
    }
    
    const iframe = document.createElement('iframe');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '325');
    iframe.setAttribute('title', 'Transistor podcasts');
    iframe.setAttribute('frameborder', 'no');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('seamless', '');
    iframe.setAttribute('src', embedUrl.toString());
    figure.appendChild(iframe);

    // Use innerHTML to inject script - jsdom's createElement('script') doesn't serialize textContent in outerHTML
    // Matches implementation from kg-default-nodes set-src-background-from-parent.js
    figure.insertAdjacentHTML('beforeend', buildSrcBackgroundScript());

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

function buildSrcBackgroundScript() {
    /* eslint-disable no-undef */
    // This function is serialized via .toString() and runs in the browser, not Node
    function setSrcBackgroundFromParent() {
        const script = document.currentScript;
        if (!script) {
            return;
        }

        const el = script.parentElement.querySelector('iframe');
        if (!el) {
            return;
        }

        function isTransparent(bg) {
            if (!bg || bg === 'transparent') {
                return true;
            }
            const m = bg.match(/[\d.]+/g);
            return m && m.length >= 4 && parseFloat(m[3]) === 0;
        }

        let node = el.parentElement;
        let bg;
        while (node) {
            bg = window.getComputedStyle(node).backgroundColor;
            if (!isTransparent(bg)) {
                break;
            }
            node = node.parentElement;
        }

        if (!node || isTransparent(bg)) {
            return;
        }

        const m = bg.match(/\d+/g);
        if (m && m.length >= 3) {
            const hex = m.slice(0, 3).map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
            const u = new URL(el.src);
            u.searchParams.set('background', hex);
            el.src = u.toString();
        }
    }
    /* eslint-enable no-undef */

    return `<script>(${setSrcBackgroundFromParent.toString()})()</script>`;
}

module.exports = renderTransistorNode;
