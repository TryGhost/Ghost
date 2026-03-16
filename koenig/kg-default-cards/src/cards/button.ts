import {
    absoluteToRelative,
    relativeToAbsolute,
    toTransformReady
} from '@tryghost/url-utils/lib/utils';
import {hbs, dedent} from '../utils/index.js';
import type {Card} from '../types.js';

const buttonCard: Card = {
    name: 'button',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.buttonUrl || !payload.buttonText) {
            return dom.createTextNode('');
        }

        const frontendTemplate = hbs`
            <div class="kg-card kg-button-card kg-align-{{alignment}}">
                <a href="{{buttonUrl}}" class="kg-btn kg-btn-accent">{{buttonText}}</a>
            </div>
        `;

        const emailTemplate = hbs`
            <p>
                <div class="btn btn-accent">
                    <table border="0" cellspacing="0" cellpadding="0" align="{{alignment}}">
                        <tr>
                            <td align="center">
                                <a href="{{buttonUrl}}">{{buttonText}}</a>
                            </td>
                        </tr>
                    </table>
                </div>
            </p>
        `;

        const renderTemplate = options.target === 'email' ? emailTemplate : frontendTemplate;
        const templateData = Object.assign({alignment: 'left'}, payload);

        const html = dedent(renderTemplate(templateData));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.buttonUrl = payload.buttonUrl && absoluteToRelative(payload.buttonUrl as string, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.buttonUrl = payload.buttonUrl && relativeToAbsolute(payload.buttonUrl as string, options.siteUrl, options.itemUrl ?? '', options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.buttonUrl = payload.buttonUrl && toTransformReady(payload.buttonUrl as string, options.siteUrl, options.itemUrl, options);
        return payload;
    }
};

export default buttonCard;
