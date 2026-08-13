const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:exports');
const {createZipStreamResponse} = require('./stream-zip-response');

module.exports = {
    /**
     * @param {{archive: NodeJS.ReadableStream, filename: string}} data
     */
    download(data, apiConfig, frame) {
        debug('download');

        // frame.response becomes a handler the http layer hands the express
        // response to — the zip streams while it is being composed
        frame.response = createZipStreamResponse({
            source: data.archive,
            filename: data.filename
        });
    }
};
