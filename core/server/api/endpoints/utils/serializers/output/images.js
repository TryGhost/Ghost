const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:images');
const mappers = require('./mappers');

module.exports = {
    upload(path, apiConfig, frame) {
        debug('upload');

        return frame.response = {
            images: [{
                url: mappers.images(path),
                // NOTE: ref field is here to have reference point on the client
                //       for example when substituting existing images in the mobiledoc
                //       this field would serve as an identifier to find images to replace
                //       once the response is back. Think of it as ID on the client's side.
                ref: frame.data.ref || null
            }]
        };
    }
};
