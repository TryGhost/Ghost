// # Ghost Foot Helper
// Usage: `{{ghost_foot}}`
//
// Outputs scripts and other assets at the bottom of a Ghost theme
const {settingsCache, labs} = require('../services/proxy');
const {SafeString, templates, hbs} = require('../services/handlebars');
const _ = require('lodash');

const createFrame = hbs.handlebars.createFrame;

// We use the name ghost_foot to match the helper for consistency:
module.exports = function ghost_foot(options) { // eslint-disable-line camelcase
    const foot = [];

    const globalCodeinjection = settingsCache.get('codeinjection_foot');
    const postCodeinjection = options.data.root && options.data.root.post ? options.data.root.post.codeinjection_foot : null;
    const tagCodeinjection = options.data.root && options.data.root.tag ? options.data.root.tag.codeinjection_foot : null;

    if (!_.isEmpty(globalCodeinjection)) {
        foot.push(globalCodeinjection);
    }

    if (!_.isEmpty(postCodeinjection)) {
        foot.push(postCodeinjection);
    }

    if (!_.isEmpty(tagCodeinjection)) {
        foot.push(tagCodeinjection);
    }

    // Reader-side gift toast. `_giftLink` is set on res.locals by the entry
    // controller only on a verified gift render, so it shows on gift reads and
    // never on canonical URLs. Overridable: a theme can supply its own
    // `partials/gift-toast.hbs`.
    if (labs.isSet('giftLinks') && options.data.root._giftLink) {
        const data = createFrame(options.data);
        foot.push(templates.execute('gift-toast', this, {data}));
    }

    return new SafeString(foot.join(' ').trim());
};
