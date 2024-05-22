const yaml = require('js-yaml');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    parsingError: {
        message: 'Could not parse provided YAML file: {context}.',
        help: 'Check provided file for typos and fix the named issues.'
    },
    invalidYamlFormat: {
        message: 'YAML input cannot be a plain string. Check the format of your YAML file.',
        help: 'https://ghost.org/docs/themes/routing/'
    }
};

/**
 * Takes a YAML formatted string and parses it and returns a JSON Object
 * @param {String} file the YAML file utf8 encoded
 * @returns {Object} parsed
 */
module.exports = function parseYaml(file) {
    try {
        const parsed = yaml.load(file);

        // yaml.load passes almost every yaml code.
        // Because of that, it's hard to detect if there's an error in the file.
        // But one of the obvious errors is the plain string output.
        // Here we check if the user made this mistake.
        if (typeof parsed === 'string') {
            throw new errors.IncorrectUsageError({
                message: messages.invalidYamlFormat.message,
                help: messages.invalidYamlFormat.help
            });
        }

        return parsed;
    } catch (error) {
        if (errors.utils.isGhostError(error)) {
            throw error;
        }

        // CASE: parsing failed, `js-yaml` tells us exactly what and where in the
        // `reason` property as well as in the message.
        // As the file uploaded is invalid, the person uploading must fix this - it's a 4xx error
        throw new errors.IncorrectUsageError({
            message: tpl(messages.parsingError.message, {context: error.reason}),
            code: 'YAML_PARSER_ERROR',
            context: error.message,
            err: error,
            help: messages.parsingError.help
        });
    }
};
