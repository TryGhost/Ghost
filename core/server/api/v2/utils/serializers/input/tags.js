const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:tags');
const url = require('./utils/url');

module.exports = {
    edit(apiConfig, frame) {
        debug('edit');
        frame.data.tags[0] = url.forTag(Object.assign({}, frame.data.tags[0]));
    }
};
