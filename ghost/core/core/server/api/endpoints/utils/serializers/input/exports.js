const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:input:exports');
const optionsUtil = require('@tryghost/api-framework').utils.options;

module.exports = {
    download(apiConfig, frame) {
        debug('download');

        // `components` arrives as a comma-separated string, or as an array
        // when the query param is repeated; absent stays absent
        if (frame.options.components !== undefined) {
            frame.options.components = optionsUtil
                .trimAndLowerCase(frame.options.components)
                .filter(component => component !== '');
        }
    }
};
