const debug = require('ghost-ignition').debug('api:v2:utils:serializers:input:pages');

function removeMobiledocFormat(frame) {
    if (frame.options.formats && frame.options.formats.includes('mobiledoc')) {
        frame.options.formats = frame.options.formats.filter((format) => {
            return (format !== 'mobiledoc');
        });
    }
}

module.exports = {
    browse(apiConfig, frame) {
        debug('browse');

        // CASE: the content api endpoints for pages forces the model layer to return static pages only.
        //       we have to enforce the filter.
        if (frame.options.filter) {
            frame.options.filter = `${frame.options.filter}+page:true`;
        } else {
            frame.options.filter = 'page:true';
        }

        removeMobiledocFormat(frame);

        debug(frame.options);
    },

    read(apiConfig, frame) {
        debug('read');

        frame.data.page = true;
        removeMobiledocFormat(frame);

        debug(frame.options);
    }
};
