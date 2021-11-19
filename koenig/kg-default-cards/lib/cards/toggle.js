const {
    htmlToTransformReady
} = require('@tryghost/url-utils/lib/utils');
const {
    hbs,
    dedent
} = require('../utils');

module.exports = {
    name: 'toggle',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        if (!payload.heading) {
            return dom.createTextNode('');
        }

        const frontendTemplate = hbs`
                <div class="kg-card kg-toggle-card" data-kg-card="toggle" data-kg-toggle-state="close">
                <div class="kg-toggle-heading">
                    <div class="kg-toggle-heading-text"><h4>{{{heading}}}</h4></div>
                    <div class="kg-toggle-card-icon">
                        <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;fill-rule:evenodd;}</style></defs><title>arrow</title><path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"/></svg>
                    </div>
                </div>
                <div class="kg-toggle-content">{{{content}}}</div>
            </div>
        `;

        const emailTemplate = hbs`
            <div style="border: 1px solid rgba(127, 127, 127, 0.15); border-radius: 4px; padding: 20px;">
                <h4 style="font-size: 1.375rem; font-weight: 600; margin-bottom: 8px; margin-top:0px">{{{heading}}}</h4>
                <div style="font-size: 1rem; line-height: 1.5; margin-bottom: -1.5em;">{{{content}}}</div>
            </div>
        `;

        const renderTemplate = options.target === 'email' ? emailTemplate : frontendTemplate;

        const html = dedent(renderTemplate({
            heading: payload.heading,
            content: payload.content
        }));

        return dom.createRawHTMLSection(html);
    },

    toTransformReady(payload, options) {
        payload.heading = payload.heading && htmlToTransformReady(payload.heading, options.siteUrl, options);
        payload.content = payload.content && htmlToTransformReady(payload.content, options.siteUrl, options);
        return payload;
    }
};
