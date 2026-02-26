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

    const placeholder = document.createElement('div');
    placeholder.setAttribute('class', 'kg-transistor-placeholder');

    const icon = document.createElement('div');
    icon.setAttribute('class', 'kg-transistor-icon');
    icon.innerHTML = `<svg viewBox="5 0.5 144 144" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M77 120.3c-2.6 0-4.8-2.1-4.8-4.8V29.4c0-2.6 2.1-4.8 4.8-4.8s4.8 2.1 4.8 4.8v86.2c0 2.6-2.2 4.7-4.8 4.7z"/><path d="M57 77.3H34c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.1 4.8-4.8 4.8z"/><path d="M120.1 77.3h-23c-2.6 0-4.8-2.1-4.8-4.8 0-2.6 2.1-4.8 4.8-4.8h23c2.6 0 4.8 2.1 4.8 4.8 0 2.6-2.2 4.8-4.8 4.8z"/><path d="M77 144.5c-39.7 0-72-32.3-72-72s32.3-72 72-72 72 32.3 72 72-32.3 72-72 72zM77 10c-34.4 0-62.4 28-62.4 62.4 0 34.4 28 62.4 62.4 62.4 34.4 0 62.4-28 62.4-62.4C139.4 38 111.4 10 77 10z"/></g></svg>`;

    const content = document.createElement('div');
    content.setAttribute('class', 'kg-transistor-content');

    const title = document.createElement('div');
    title.setAttribute('class', 'kg-transistor-title');
    title.textContent = 'Members-only podcasts';

    const description = document.createElement('div');
    description.setAttribute('class', 'kg-transistor-description');
    description.textContent = 'Your Transistor podcasts will appear here. Members will see subscribe links based on their access level.';

    content.appendChild(title);
    content.appendChild(description);
    placeholder.appendChild(icon);
    placeholder.appendChild(content);
    figure.appendChild(placeholder);

    return renderWithVisibility({element: figure, type: 'inner'}, node.visibility, options);
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
                <td style="padding: 24px; text-align: center;">
                    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="text-align: center;">
                        <tr>
                            <td style="text-align: center; padding-bottom: 12px;">
                                <a href="${transistorUrl}" style="display: inline-block; width: 72px; height: 72px; padding-top: 4px; padding-right: 4px; padding-bottom: 4px; padding-left: 4px; border-radius: 8px; background-color: ${accentColor}">
                                    <img src="https://static.ghost.org/v6.0.0/images/transistor-logo-ondark.png"
                                        width="40" height="40"
                                        alt="Transistor"
                                        style="width: 40px; height: 40px; padding: 16px;">
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center;">
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
