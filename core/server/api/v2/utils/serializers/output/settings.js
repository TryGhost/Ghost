const _ = require('lodash');
const utils = require('../../index');
const mapper = require('./utils/mapper');
const _private = {};
const deprecatedSettings = ['secondary_nav'];

/**
 * ### Settings Filter
 * Filters an object based on a given filter object
 * @private
 * @param {Object} settings
 * @param {String} filter
 * @returns {*}
 */
_private.settingsFilter = (settings, filter) => {
    let filteredGroups = filter ? filter.split(',') : false;
    return _.filter(settings, (setting) => {
        if (filteredGroups) {
            return _.includes(filteredGroups, setting.group) && !_.includes(deprecatedSettings, setting.key);
        }

        return !_.includes(deprecatedSettings, setting.key);
    });
};

module.exports = {
    browse(models, apiConfig, frame) {
        let filteredSettings;

        // If this is public, we already have the right data, we just need to add an Array wrapper
        if (utils.isContentAPI(frame)) {
            filteredSettings = models;
        } else {
            filteredSettings = _.values(_private.settingsFilter(models, frame.options.type));
        }

        frame.response = {
            settings: mapper.mapSettings(filteredSettings, frame),
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
