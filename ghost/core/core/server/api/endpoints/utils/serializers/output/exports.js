const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:exports');
const {createZipStreamResponse} = require('./stream-zip-response');

module.exports = {
    /**
     * @param {{archive: NodeJS.ReadableStream, filename: string}} data
     */
    download(data, apiConfig, frame) {
        debug('download');

        frame.response = createZipStreamResponse({
            source: data.archive,
            filename: data.filename
        });
    }
};
