const debug = require('@tryghost/debug')('api:v2:utils:serializers:input:tags');
const url = require('./utils/url');
const utils = require('../../index');

function setDefaultOrder(frame) {
    if (!frame.options.order) {
        frame.options.order = 'name asc';
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
