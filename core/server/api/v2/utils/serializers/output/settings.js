const _ = require('lodash');
const _private = {};

/**
 * ### Settings Filter
 * Filters an object based on a given filter object
 * @private
 * @param {Object} settings
 * @param {String} filter
 * @returns {*}
 */
_private.settingsFilter = (settings, filter) => {
    return _.fromPairs(_.toPairs(settings).filter((setting) => {
        if (filter) {
            return _.some(filter.split(','), (f) => {
                return setting[1].type === f;
            });
        }
        return true;
    }));
};

module.exports = {
    browse(models, apiConfig, frame) {
        let filteredSettings = _.values(_private.settingsFilter(models, frame.options.type));

        frame.response = {
            settings: filteredSettings,
            meta: {}
        };

        if (frame.options.type) {
            frame.response.meta.filters = {
                type: frame.options.type
            };
        }
    },

    read() {
        this.browse(...arguments);
    },

    edit(models, apiConfig, frame) {
        const settingsKeyedJSON = _.keyBy(_.invokeMap(models, 'toJSON'), 'key');
        this.browse(settingsKeyedJSON, apiConfig, frame);
    },

    download(bytes, apiConfig, frame) {
        frame.response = bytes;
    }
};
