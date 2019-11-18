const yaml = require('js-yaml'),
    debug = require('ghost-ignition').debug('frontend:services:settings:yaml-parser'),
    common = require('../../../server/lib/common');

/**
 * Takes a YAML file, parses it and returns a JSON Object
 * @param {YAML} file the YAML file utf8 encoded
 * @param {String} fileName the name of the file incl. extension
 * @returns {Object} parsed
 */
module.exports = function parseYaml(file, fileName) {
    try {
        const parsed = yaml.safeLoad(file);

        debug('YAML settings file parsed:', fileName);

        return parsed;
    } catch (error) {
        // CASE: parsing failed, `js-yaml` tells us exactly what and where in the
        // `reason` property as well as in the message.
        // As the file uploaded is invalid, the person uploading must fix this - it's a 4xx error
        throw new common.errors.IncorrectUsageError({
            message: common.i18n.t('errors.services.settings.yaml.error', {file: fileName, context: error.reason}),
            code: 'YAML_PARSER_ERROR',
            context: error.message,
            err: error,
            help: common.i18n.t('errors.services.settings.yaml.help', {file: fileName})
        });
    }
};
