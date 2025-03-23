const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:default');
const mappers = require('./mappers');

const mapResponse = (docName, mappable, frame) => {
    if (mappers[docName]) {
        return mappers[docName](mappable, frame);
    } else if (mappable.toJSON) {
        return mappable.toJSON(frame.options);
    }

    return mappable;
};

module.exports = {
    all(response, apiConfig, frame) {
        const {docName, method} = apiConfig;
        debug('serializing', docName, method);

        if (!response) {
            return;
        }

        frame.response = {};

        if (response.data) {
            frame.response[docName] = response.data.map(model => mapResponse(docName, model, frame));
        } else {
            frame.response[docName] = [mapResponse(docName, response, frame)];
        }

        if (response.meta) {
            frame.response.meta = response.meta;
        }
    }
};
