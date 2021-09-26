const yaml = require('js-yaml');
const debug = require('@tryghost/debug')('frontend:services:settings:yaml-parser');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    error: 'Could not parse {file}: {context}.',
    help: 'Check your {file} file for typos and fix the named issues.'
};

/**
 * Takes a YAML file, parses it and returns a JSON Object
 * @param {YAML} file the YAML file utf8 encoded
 * @param {String} fileName the name of the file incl. extension
 * @returns {Object} parsed
 */
module.exports = function parseYaml(file, fileName) {
    try {
        const parsed = yaml.load(file);

        debug('YAML settings file parsed:', fileName);

        return parsed;
    } catch (error) {
        // CASE: parsing failed, `js-yaml` tells us exactly what and where in the
        // `reason` property as well as in the message.
        // As the file uploaded is invalid, the person uploading must fix this - it's a 4xx error
        throw new errors.IncorrectUsageError({
            message: tpl(messages.error, {file: fileName, context: error.reason}),
            code: 'YAML_PARSER_ERROR',
            context: error.message,
            err: error,
            help: tpl(messages.help, {file: fileName})
        });
    }
};
