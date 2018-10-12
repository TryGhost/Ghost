const debug = require('ghost-ignition').debug('api:shared:serializers:input:all');
const _ = require('lodash');
const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

const trimAndLowerCase = (params) => {
    params = params || '';
    if (_.isString(params)) {
        params = params.split(',');
    }

    return params.map((item) => {
        return item.trim().toLowerCase();
    });
};

/**
 * Transform into model readable language.
 */
module.exports = {
    all(apiConfig, frame) {
        debug('serialize all');

        if (frame.options.include) {
            frame.options.withRelated = trimAndLowerCase(frame.options.include);
            delete frame.options.include;
        }

        if (frame.options.fields) {
            frame.options.columns = trimAndLowerCase(frame.options.fields);
            delete frame.options.fields;
        }

        if (frame.options.formats) {
            frame.options.formats = trimAndLowerCase(frame.options.formats);
        }

        if (frame.options.formats && frame.options.columns) {
            frame.options.columns = frame.options.columns.concat(frame.options.formats);
        }

        if (!frame.options.context.internal) {
            debug('omit internal options');
            frame.options = _.omit(frame.options, INTERNAL_OPTIONS);
        }

        debug(frame.options);
    },

    add(apiConfig, frame) {
        // CASE: will remove unwanted null values
        _.each(frame.data[apiConfig.docName], (value, index) => {
            if (!_.isObject(frame.data[apiConfig.docName][index])) {
                return;
            }

            frame.data[apiConfig.docName][index] = _.omitBy(frame.data[apiConfig.docName][index], _.isNull);
        });
    },

    edit() {
        return this.add(...arguments);
    }
};
