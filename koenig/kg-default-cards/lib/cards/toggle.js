const {
    htmlToTransformReady,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute
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
            <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                <div class="kg-toggle-heading">
                    <h4 class="kg-toggle-heading-text">{{{heading}}}</h4>
                    <button class="kg-toggle-card-icon">
                        <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"/></svg>
                    </button>
                </div>
                <div class="kg-toggle-content">{{{content}}}</div>
            </div>
        `;

        const emailTemplate = hbs`
            <div class="kg-toggle-card">
                <h4 style="font-size: 1.375rem !important; font-weight: 600; margin-bottom: 8px; margin-top:0px">{{{heading}}}</h4>
                <div style="font-size: 1rem !important; line-height: 1.5; margin-bottom: -1.5em;">{{{content}}}</div>
            </div>
        `;

        const renderTemplate = options.target === 'email' ? emailTemplate : frontendTemplate;

        const html = dedent(renderTemplate({
            heading: payload.heading,
            content: payload.content
        }));

        return dom.createRawHTMLSection(html);
    },

    absoluteToRelative(payload, options) {
        payload.content = payload.content && htmlAbsoluteToRelative(payload.content, options.siteUrl, options);
        return payload;
    },

    relativeToAbsolute(payload, options) {
        payload.content = payload.content && htmlRelativeToAbsolute(payload.content, options.siteUrl, options.itemUrl, options);
        return payload;
    },

    toTransformReady(payload, options) {
        payload.heading = payload.heading && htmlToTransformReady(payload.heading, options.siteUrl, options);
        payload.content = payload.content && htmlToTransformReady(payload.content, options.siteUrl, options);
        return payload;
    }
};
