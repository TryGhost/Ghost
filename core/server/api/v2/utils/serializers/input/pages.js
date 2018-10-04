const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:pages');

module.exports = {
    all(apiConfig, frame) {
        debug('all');

        if (frame.options.filter) {
            if (frame.options.filter.match(/page:\w+\+?/)) {
                frame.options.filter = frame.options.filter.replace(/page:\w+\+?/, '');
            }

            if (frame.options.filter) {
                frame.options.filter = frame.options.filter + '+page:true';
            } else {
                frame.options.filter = 'page:true';
            }
        } else {
            frame.options.filter = 'page:true';
        }

        debug(frame.options);
    }
};
