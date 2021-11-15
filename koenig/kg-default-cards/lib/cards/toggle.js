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

    render({payload, env: {dom}}) {
        if (!payload.heading) {
            return dom.createTextNode('');
        }

        const template = hbs`
            <div data-kg-card="toggle" class="kg-toggle-card">
                <div class="kg-toggle-heading">
                    <svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5px;fill-rule:evenodd;}</style></defs><title>arrow-down-1</title><path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"/></svg>
                    <div class="kg-toggle-heading-text">{{{heading}}}</div>
                </div>
                <div class="kg-toggle-content">{{{content}}}</div>
            </div>
        `;

        const html = dedent(template({
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
