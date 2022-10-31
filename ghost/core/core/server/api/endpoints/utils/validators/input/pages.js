const jsonSchema = require('../utils/json-schema');
const models = require('../../../../../models');
const {ValidationError} = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidVisibilityFilter: 'Invalid filter in visibility_filter property',
    onlySingleContentSource: 'Pages can have either a mobiledoc or a lexical property, never both.',
    onlySingleContentSourceContext: 'Both the mobiledoc and lexical properties are set, one must be null',
    onlySingleContentSourceHelp: 'https://ghost.org/docs/admin-api/#the-post-object'
};

const validateVisibility = async function (frame) {
    if (!frame.data.pages || !frame.data.pages[0]) {
        return Promise.resolve();
    }

    // validate visibility - not done at schema level because this can be an NQL query so needs model access
    const visibility = frame.data.pages[0].visibility;
    const visibilityFilter = frame.data.pages[0].visibility_filter;
    if (visibility) {
        if (!['public', 'members', 'paid', 'tiers'].includes(visibility)) {
            // check filter is valid
            try {
                await models.Member.findPage({filter: visibilityFilter, limit: 1});
                return Promise.resolve();
            } catch (err) {
                return Promise.reject(new ValidationError({
                    message: tpl(messages.invalidVisibilityFilter),
                    property: 'visibility_filter'
                }));
            }
        }

        return Promise.resolve();
    }
};

const validateSingleContentSource = async function (frame) {
    if (!frame.data.pages?.[0]) {
        return;
    }

    const [page] = frame.data.pages;
    if (page.mobiledoc && page.lexical) {
        return Promise.reject(new ValidationError({
            message: tpl(messages.onlySingleContentSource),
            context: tpl(messages.onlySingleContentSourceContext),
            help: tpl(messages.onlySingleContentSourceHelp),
            property: 'lexical'
        }));
    }
};

module.exports = {
    async add(apiConfig, frame) {
        await jsonSchema.validate(...arguments);
        await validateVisibility(frame);
        await validateSingleContentSource(frame);
    },
    async edit(apiConfig, frame) {
        await jsonSchema.validate(...arguments);
        await validateVisibility(frame);
        await validateSingleContentSource(frame);
    }
};
