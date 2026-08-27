import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {html} from '../../utils/tagged-template-fns.js';

interface RenderOptions extends ExportDOMOptions {}

function horizontalRuleFrontendTemplate() {
    return html`<hr />`;
}

function horizontalRuleEmailTemplate() {
    // Outlook doesn't support HR tags so we need to use a table with colored borders
    // Outer table sets spacing using padding for Outlook compatibility, inner table houses the colored border.

    // HR is kept for html-to-plaintext conversion but not shown. Must be inside the table so we can use
    // sibling selectors to adjust spacing between headings and hr cards.
    return html`
        <table class="kg-card kg-hr-card" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
            <tbody>
                <tr>
                    <td>
                        <!--[if !mso]><!-- -->
                        <hr style="display: none;" />
                        <!--<![endif]-->
                        <table class="kg-hr" role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tbody>
                                <tr>
                                    <td>&nbsp;</td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
}

export function renderHorizontalRuleNode(_: unknown, options: RenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    let renderedHtml;
    if (options.target === 'email') {
        renderedHtml = horizontalRuleEmailTemplate();
    } else {
        renderedHtml = horizontalRuleFrontendTemplate();
    }

    const element = document.createElement('div');
    element.innerHTML = renderedHtml;
    return {element, type: 'inner' as const};
}
