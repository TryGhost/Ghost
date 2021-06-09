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
        const err = new errors.IncorrectUsageError();
        err.message = tpl(messages.couldNotReadPackage);
        err.context = path;
        err.err = readError;

        return Promise.reject(err);
    }

    try {
        json = JSON.parse(source);
    } catch (parseError) {
        const err = new errors.IncorrectUsageError();
        err.message = tpl(messages.themeFileIsMalformed);
        err.context = path;
        err.err = parseError;
        err.help = tpl(messages.willBeRequired, {url: 'https://ghost.org/docs/themes/'});

        return Promise.reject(err);
    }

    const hasRequiredKeys = json.name && json.version;

    if (!hasRequiredKeys) {
        const err = new errors.IncorrectUsageError();
        err.message = tpl(messages.nameOrVersionMissing);
        err.context = path;
        err.help = tpl(messages.willBeRequired, {url: 'https://ghost.org/docs/themes/'});

        return Promise.reject(err);
    }

    return json;
}

module.exports = parse;
