const debug = require('ghost-ignition').debug('api:v3:utils:serializers:input:tags');
const url = require('./utils/url');
const slugFilterOrder = require('./utils/slug-filter-order');
const utils = require('../../index');

function setDefaultOrder(frame) {
    let defaultOrder = 'name asc';

    if (!frame.options.order && frame.options.filter) {
        frame.options.autoOrder = slugFilterOrder('tags', frame.options.filter);
    }

    if (!frame.options.order && !frame.options.autoOrder) {
        frame.options.order = defaultOrder;
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        if (utils.isContentAPI(frame)) {
            setDefaultOrder(frame);
        }
    },

    read() {
        debug('read');

        this.browse(...arguments);
    },

    add(apiConfig, frame) {
        debug('add');
        frame.data.tags[0] = url.forTag(Object.assign({}, frame.data.tags[0]));
    },

    edit(apiConfig, frame) {
        debug('edit');
        this.add(apiConfig, frame);
    }
};
