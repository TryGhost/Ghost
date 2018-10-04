const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:pages');

module.exports = {
    all(apiConfig, frame) {
        debug('all');

        // CASE: the content api endpoints for pages forces the model layer to return static pages only.
        //       we have to enforce the filter.
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
