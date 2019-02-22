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

/**
 * CASE:
 *
 * - the content api endpoints for pages forces the model layer to return static pages only
 * - we have to enforce the filter
 *
 * @TODO: https://github.com/TryGhost/Ghost/issues/10268
 */
const forcePageFilter = (frame) => {
    if (frame.options.filter) {
        frame.options.filter = `(${frame.options.filter})+page:true`;
    } else {
        frame.options.filter = 'page:true';
    }
};

const forceStatusFilter = (frame) => {
    if (!frame.options.filter) {
        frame.options.filter = 'status:[draft,published,scheduled]';
    } else if (!frame.options.filter.match(/status:/)) {
        frame.options.filter = `(${frame.options.filter})+status:[draft,published,scheduled]`;
    }
};

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        forcePageFilter(frame);

        if (localUtils.isContentAPI(frame)) {
            removeMobiledocFormat(frame);
            setDefaultOrder(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            forceStatusFilter(frame);
        }

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        forcePageFilter(frame);

        if (localUtils.isContentAPI(frame)) {
            removeMobiledocFormat(frame);
            setDefaultOrder(frame);
        }

        if (!localUtils.isContentAPI(frame)) {
            forceStatusFilter(frame);
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

        forceStatusFilter(frame);
        forcePageFilter(frame);
    },

    destroy(apiConfig, frame) {
        frame.options.destroyBy = {
            id: frame.options.id,
            page: true
        };
    }
};
