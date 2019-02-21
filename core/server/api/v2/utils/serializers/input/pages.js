const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:pages');
const converters = require('../../../../../lib/mobiledoc/converters');
const url = require('./utils/url');
const localUtils = require('../../index');

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
            frame.options.filter = `(${frame.options.filter})+page:true`;
        } else {
            frame.options.filter = 'page:true';
        }

        if (localUtils.isContentAPI(frame)) {
            removeMobiledocFormat(frame);
            setDefaultOrder(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            // @TODO: remove when we drop v0.1
            if (!frame.options.filter || !frame.options.filter.match(/status:/)) {
                frame.options.status = 'all';
            }
        }

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        frame.data.page = true;

        if (localUtils.isContentAPI(frame)) {
            removeMobiledocFormat(frame);
            setDefaultOrder(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            // @TODO: remove when we drop v0.1
            if (!frame.options.filter || !frame.options.filter.match(/status:/)) {
                frame.data.status = 'all';
            }
        }

        debug(frame.options);
    },

    add(apiConfig, frame) {
        debug('add');

        if (_.get(frame,'options.source')) {
            const html = frame.data.pages[0].html;

            if (frame.options.source === 'html' && !_.isEmpty(html)) {
                frame.data.pages[0].mobiledoc = JSON.stringify(converters.htmlToMobiledocConverter(html));
            }
        }

        frame.data.pages[0] = url.forPost(Object.assign({}, frame.data.pages[0]), frame.options);

        // @NOTE: force storing page
        frame.data.pages[0].page = true;
    },

    edit(apiConfig, frame) {
        this.add(...arguments);

        debug('edit');

        // @NOTE: force not being able to update a page via pages endpoint
        frame.options.page = true;
    },

    destroy(apiConfig, frame) {
        frame.options.destroyBy = {
            id: frame.options.id,
            page: true
        };
    }
};
