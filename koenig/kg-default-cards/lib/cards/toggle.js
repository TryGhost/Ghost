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
                <div class="kg-toggle-heading">{{{heading}}}</div>
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
