const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:pages');

function removeMobiledocFormat(frame) {
    if (frame.options.formats && frame.options.formats.includes('mobiledoc')) {
        frame.options.formats = frame.options.formats.filter((format) => {
            return (format !== 'mobiledoc');
        });
    }
}

function setDefaultOrder(frame) {
    let includesOrderedRelations = false;

    if (frame.options.withRelated) {
        const orderedRelations = ['author', 'authors', 'tag', 'tags'];
        includesOrderedRelations = _.intersection(orderedRelations, frame.options.withRelated).length > 0;
    }

    if (!frame.options.order && !includesOrderedRelations) {
        frame.options.order = 'title asc';
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        /**
         * CASE:
         *
         * - the content api endpoints for pages forces the model layer to return static pages only
         * - we have to enforce the filter
         *
         * @TODO: https://github.com/TryGhost/Ghost/issues/10268
         */
        if (frame.options.filter) {
            frame.options.filter = `${frame.options.filter}+page:true`;
        } else {
            frame.options.filter = 'page:true';
        }

        removeMobiledocFormat(frame);

        setDefaultOrder(frame);

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        frame.data.page = true;
        removeMobiledocFormat(frame);

        setDefaultOrder(frame);

        debug(frame.options);
    }
};
