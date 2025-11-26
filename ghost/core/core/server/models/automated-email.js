const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');
const lexicalLib = require('../lib/lexical');

const AutomatedEmail = ghostBookshelf.Model.extend({
    tableName: 'automated_emails',

    defaults() {
        return {
            status: 'inactive'
        };
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // transform URLs from __GHOST_URL__ to absolute
        if (attrs.lexical) {
            attrs.lexical = urlUtils.transformReadyToAbsolute(attrs.lexical);
        }

        return attrs;
    },

    // Alternative to Bookshelf's .format() that is only called when writing to db
    formatOnWrite(attrs) {
        // Ensure lexical URLs are stored as transform-ready with __GHOST_URL__ representing config.url
        if (attrs.lexical) {
            attrs.lexical = urlUtils.lexicalToTransformReady(attrs.lexical, {
                nodes: lexicalLib.nodes,
                transformMap: lexicalLib.urlTransformMap
            });
        }

        return attrs;
    }
});

module.exports = {
    AutomatedEmail: ghostBookshelf.model('AutomatedEmail', AutomatedEmail)
};
