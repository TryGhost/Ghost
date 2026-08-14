// The event model doesn't reliably carry the relations the URL service reads
// when routing (collection filters like tags:internal-tag), so under lazy
// routing an under-loaded post 404s. Ask the URL service which relations it
// needs and load only the ones missing — reloading a relation the event
// already carries (e.g. authors) would strip its nested roles from the
// payload. Returns [] under eager routing, which resolves URLs by id.
const loadRequiredUrlRelations = async (model, urlService) => {
    const required = urlService.getRequiredRelations();
    const missing = required.filter(relation => !model.relations[relation]);
    if (missing.length) {
        await model.load(missing);
    }
};

module.exports = ({urlService}) => async (event, model) => {
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
            await loadRequiredUrlRelations(model, urlService);
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
