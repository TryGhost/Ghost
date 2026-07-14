const _ = require('lodash');
const utils = require('../../index');
const mappers = require('./mappers');
const aiService = require('../../../../../services/ai');

/** @typedef {import('@tryghost/api-framework').Frame} Frame */

/**
 * Filters an object based on a given filter object
 * @private
 * @param {Object} settings
 * @param {string} filter
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
 * @param {Frame} frame
 */
function serializeSettings(models, apiConfig, frame) {
    let filteredSettings;

    // If this is public, we already have the right data, we just need to add an Array wrapper
    if (utils.isContentAPI(frame)) {
        filteredSettings = models;

        // Change the returned icon location to use a resized version, to prevent serving giant icon files
        const icon = filteredSettings.icon;
        if (icon) {
            filteredSettings.icon = filteredSettings.icon.replace(/\/content\/images\//, '/content/images/size/w256h256/');
        }
    } else {
        filteredSettings = _.values(settingsFilter(models, frame.options.group));

        // Change the returned icon location to use a resized version, to prevent serving giant icon files
        // in admin
        const icon = filteredSettings.find(setting => setting.key === 'icon');
        if (icon && icon.value) {
            icon.value = icon.value.replace(/\/content\/images\//, '/content/images/size/w256h256/');
        }

        // Inject virtual (computed, never stored) AI capability flags so the
        // admin UI can gate features on actual server-side capability rather
        // than inferring it from which provider keys are present.
        const requestedGroups = frame.options.group ? frame.options.group.split(',') : [];
        if (requestedGroups.length === 0 || requestedGroups.includes('ai')) {
            filteredSettings.push({
                key: 'ai_vision_to_text_available',
                value: aiService.hasCapability('vision-to-text'),
                group: 'ai',
                is_read_only: true
            });
        }
    }

    frame.response = {
        settings: mappers.settings(filteredSettings),
        meta: models.meta ?? {}
    };

    if (frame.options.group) {
        frame.response.meta.filters = {
            group: frame.options.group
        };
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
 * @param {Frame} frame
 */
function serializeData(data, apiConfig, frame) {
    frame.response = data;
}

module.exports = {
    browse: serializeSettings,
    read: serializeSettings,
    edit: serializeSettings,
    regenerateAccessCode: serializeSettings,
    verifyKeyUpdate: serializeSettings,

    download: serializeData,
    upload: serializeData,

    validateMembersEmailUpdate: passthrough
};
