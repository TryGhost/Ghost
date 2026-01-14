const fs = require('fs-extra');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    couldNotReadPackage: 'Could not read package.json file',
    nameOrVersionMissing: '"name" or "version" is missing from theme package.json file.',
    willBeRequired: 'This will be required in future. Please see {url}',
    themeFileIsMalformed: 'Theme package.json file is malformed'
};

/**
 * Parse package.json and validate it has
 * all the required fields
 *
 * @param {string} path
 * @returns {Promise<object>}
 */
async function parse(path) {
    let source;
    let json;

    try {
        source = await fs.readFile(path, {encoding: 'utf8'});
    } catch (readError) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.couldNotReadPackage),
            context: path,
            err: readError
        });
    }

    try {
        json = JSON.parse(source);
    } catch (parseError) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.themeFileIsMalformed),
            context: path,
            err: parseError,
            help: tpl(messages.willBeRequired, {url: 'https://ghost.org/docs/themes/'})
        });
    }

    const hasRequiredKeys = json.name && json.version;

    if (!hasRequiredKeys) {
        throw new errors.IncorrectUsageError({
            message: tpl(messages.nameOrVersionMissing),
            context: path,
            help: tpl(messages.willBeRequired, {url: 'https://ghost.org/docs/themes/'})
        });
    }

    return json;
}

module.exports = parse;
