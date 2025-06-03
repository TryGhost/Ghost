const {addCreateDocumentOption} = require('../render-utils/add-create-document-option');

function renderHorizontalRuleNode(_, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    // For email rendering, use Outlook-compatible table-based horizontal rule
    if (options.target === 'email') {
        if (!options.feature?.emailCustomizationAlpha) {
            return {element: document.createElement('hr')};
        }
        let color = options.design?.dividerColor;
        if (!color) {
            color = '#e5e5e5';
        }
        const emailDoc = options.createDocument();
        const emailDiv = emailDoc.createElement('div');
        // Outlook-compatible horizontal rule using table with VML fallback
        emailDiv.innerHTML = `
            <div style="margin: 3em 0;">
                <!--[if mso | IE]>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0; width: 100%;">
                    <tr>
                        <td style="padding: 0; margin: 0; width: 100%;">
                            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width: 600px; height: 1px; position: relative;">
                                <v:fill type="tile" color="${color}" />
                            </v:rect>
                        </td>
                    </tr>
                </table>
                <![endif]-->
                <!--[if !mso]><!-->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0;">
                    <tr>
                        <td height="1" style="line-height: 1px; font-size: 1px; background-color: ${color}; padding: 0; margin: 0;">&nbsp;</td>
                    </tr>
                </table>
                <!--<![endif]-->
            </div>
        `;

        return {element: emailDiv.firstElementChild};
    }

    const element = document.createElement('hr');
    return {element};
}

module.exports = renderHorizontalRuleNode;
