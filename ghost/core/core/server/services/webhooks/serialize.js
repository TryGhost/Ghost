module.exports = (event, model) => {
    const _ = require('lodash');
    const {sequence} = require('@tryghost/promise');
    const api = require('../../api').endpoints;
    const apiFramework = require('@tryghost/api-framework');

    const resourceName = event.match(/(\w+)\./)[1];
    const docName = `${resourceName}s`;

    const ops = [];

    if (Object.keys(model.attributes).length) {
        ops.push(() => {
            let frame = {options: {previous: false, context: {user: true}}};

            // @NOTE: below options are lost during event processing, a more holistic approach would be
            //       to pass them somehow along with the model
            if (['posts', 'pages'].includes(docName)) {
                frame.options.formats = ['mobiledoc', 'html', 'plaintext'];
                frame.options.withRelated = ['tags', 'authors'];
                model._originalOptions = {
                    withRelated: ['tags', 'authors']
                };
            }

            return apiFramework
                .serializers
                .handle
                .output(model, {docName: docName, method: 'read'}, api.serializers.output, frame)
                .then(() => {
                    return frame.response[docName][0];
                });
        });
    } else {
        ops.push(() => {
            return Promise.resolve({});
        });
    }

    if (Object.keys(model._previousAttributes).length) {
        ops.push(() => {
            const frame = {options: {previous: true, context: {user: true}}};

            if (['posts', 'pages'].includes(docName)) {
                frame.options.formats = ['mobiledoc', 'html', 'plaintext'];
                frame.options.withRelated = ['tags', 'authors'];
            }

            return apiFramework
                .serializers
                .handle
                .output(model, {docName: docName, method: 'read'}, api.serializers.output, frame)
                .then(() => {
                    return frame.response[docName][0];
                });
        });
    } else {
        ops.push(() => {
            return Promise.resolve({});
        });
    }

    return sequence(ops)
        .then((results) => {
            const current = results[0];
            const previous = results[1];

            const changed = model._changed ? Object.keys(model._changed) : {};

            const payload = {
                [docName.replace(/s$/, '')]: {
                    current: current,
                    previous: _.pick(previous, changed)
                }
            };

            return payload;
        });
};
