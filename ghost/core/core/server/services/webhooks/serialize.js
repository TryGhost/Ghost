module.exports = async (event, model) => {
    const _ = require('lodash');
    const api = require('../../api').endpoints;
    const apiFramework = require('@tryghost/api-framework');

    const resourceName = event.match(/(\w+)\./)[1];
    const docName = `${resourceName}s`;

    const POST_FORMATS = ['html', 'plaintext'];
    const POST_WITH_RELATED = ['tags', 'authors'];
    const MEMBER_WITH_RELATED = [
        'labels',
        'products',
        'newsletters'
    ];

    let current = {};
    let previous = {};

    const changed = model._changed ? Object.keys(model._changed) : [];

    if (Object.keys(model.attributes).length) {
        let frame = {options: {previous: false, context: {user: true}}};

        // @NOTE: below options are lost during event processing, a more holistic approach would be
        //       to pass them somehow along with the model
        switch (docName) {
        case 'posts':
        case 'pages':
            frame.options.formats = POST_FORMATS;
            frame.options.withRelated = POST_WITH_RELATED;
            model._originalOptions = {
                withRelated: POST_WITH_RELATED
            };
            break;
        case 'members':
            await model.load(MEMBER_WITH_RELATED);
            break;
        default:
            break;
        }

        await apiFramework
            .serializers
            .handle
            .output(model, {docName: docName, method: 'read'}, api.serializers.output, frame);
        current = frame.response[docName][0];
    }

    if (changed.length && Object.keys(model._previousAttributes).length) {
        const frame = {options: {previous: true, context: {user: true}}};

        switch (docName) {
        case 'posts':
        case 'pages':
            frame.options.formats = POST_FORMATS;
            frame.options.withRelated = POST_WITH_RELATED;
            break;
        default:
            break;
        }

        await apiFramework
            .serializers
            .handle
            .output(model, {docName: docName, method: 'read'}, api.serializers.output, frame);
        previous = _.pick(frame.response[docName][0], changed);
    }


    const payload = {
        [docName.replace(/s$/, '')]: {
            current,
            previous
        }
    };

    return payload;
};
