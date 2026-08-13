const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:input:exports');
const optionsUtil = require('@tryghost/api-framework').utils.options;

module.exports = {
    download(apiConfig, frame) {
        debug('download');

        // `components` can arrive as a comma-separated string or, when the
        // query param is repeated, as an array — normalize both to a clean
        // array. An absent param stays absent (the query defaults it).
        if (frame.options.components !== undefined) {
            frame.options.components = optionsUtil
                .trimAndLowerCase(frame.options.components)
                .filter(component => component !== '');
        }
    }
};
