const _ = require('lodash');
const utils = require('../../index');
const mappers = require('./mappers');

/**
 * Filters an object based on a given filter object
 * @private
 * @param {Object} settings
 * @param {String} filter
 * @returns {*}
 */
function settingsFilter(settings, filter) {
    let filteredGroups = filter ? filter.split(',') : [];
    return _.filter(settings, (setting) => {
        if (filteredGroups.length > 0) {
            return _.includes(filteredGroups, setting.group);
        }

        return true;
    });
}

/**
 * Serialies a settings object into the desired API repsonse format
 *
 * @param {Object} models
 * @param {Object} apiConfig
 * @param {Object} frame
 */
function serializeSettings(models, apiConfig, frame) {
    let filteredSettings;

    // If this is public, we already have the right data, we just need to add an Array wrapper
    if (utils.isContentAPI(frame)) {
        filteredSettings = models;
    } else {
        filteredSettings = _.values(settingsFilter(models, frame.options.group));
    }

    frame.response = {
        settings: mappers.settings(filteredSettings, frame),
        meta: {}
    };

    if (frame.options.type || frame.options.group) {
        frame.response.meta.filters = {};

        if (frame.options.type) {
            frame.response.meta.filters.type = frame.options.type;
        }

        if (frame.options.group) {
            frame.response.meta.filters.group = frame.options.group;
        }
    }
}

/**
 * This noop results in there being no response body
 *
 * @template Data
 * @param {Data} data
 * @returns Data
 */
function passthrough(data) {
    return data;
}

/**
 * Returns the data as-is without any further modiications
 *
 * @template Data
 * @param {Data} data
 * @param {Object} apiConfig
 * @param {Object} frame
 */
function serializeData(data, apiConfig, frame) {
    frame.response = data;
}

module.exports = {
    browse: serializeSettings,
    read: serializeSettings,
    edit: serializeSettings,

    download: serializeData,
    upload: serializeData,

    updateMembersEmail: passthrough,
    validateMembersEmailUpdate: passthrough,
    disconnectStripeConnectIntegration: passthrough
};
