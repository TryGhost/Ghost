const debug = require('@tryghost/debug')('api:shared:serializers:input:all');
const _ = require('lodash');
const utils = require('../../utils');

const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

/**
 * @description Shared serializer for all requests.
 *
 * Transforms certain options from API notation into model readable language/notation.
 *
 * e.g. API uses "include", but model layer uses "withRelated".
 */
module.exports = {
    all(apiConfig, frame) {
        debug('serialize all');

        if (frame.options.include) {
            frame.options.withRelated = utils.options.trimAndLowerCase(frame.options.include);
            delete frame.options.include;
        }

        if (frame.options.fields) {
            frame.options.columns = utils.options.trimAndLowerCase(frame.options.fields);
            delete frame.options.fields;
        }

        if (frame.options.formats) {
            frame.options.formats = utils.options.trimAndLowerCase(frame.options.formats);
        }

        if (frame.options.formats && frame.options.columns) {
            frame.options.columns = frame.options.columns.concat(frame.options.formats);
        }

        if (!frame.options.context.internal) {
            debug('omit internal options');
            frame.options = _.omit(frame.options, INTERNAL_OPTIONS);
        }
    }
};
