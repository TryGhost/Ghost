const yaml = require('js-yaml'),
    debug = require('ghost-ignition').debug('frontend:services:settings:yaml-parser'),
    common = require('../../../server/lib/common');

/**
 * Takes a YAML file, parses it and returns a JSON Object
 * @param {YAML} content the YAML content utf8 encoded
 * @param {String} setting the settings name of the content
 * @returns {Object} parsed
 */
module.exports = function parseYaml(content, setting) {
    try {
        const parsed = yaml.safeLoad(content);

        debug('YAML settings parsed:', setting);

        return parsed;
    } catch (error) {
        // CASE: parsing failed, `js-yaml` tells us exactly what and where in the
        // `reason` property as well as in the message.
        // As the file uploaded is invalid, the person uploading must fix this - it's a 4xx error
        const fileName = `${setting}.yaml`;
        throw new common.errors.IncorrectUsageError({
            message: common.i18n.t('errors.services.settings.yaml.error', {file: fileName, context: error.reason}),
            code: 'YAML_PARSER_ERROR',
            context: error.message,
            err: error,
            help: common.i18n.t('errors.services.settings.yaml.help', {file: fileName})
        });
    }
};
