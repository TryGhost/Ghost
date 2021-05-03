const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const yaml = require('js-yaml');
const Promise = require('bluebird');
const validation = require('./validation');

const config = require('../../../shared/config');
const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');

/**
 * Redirect configuration object
 * @typedef {Object} RedirectConfig
 * @property {String} from - Defines the relative incoming URL or pattern (regex)
 * @property {String} to - Defines where the incoming traffic should be redirected to, which can be a static URL, or a dynamic value using regex (example: "to": "/$1/")
 * @property {boolean} permanent - Can be defined with true for a permanent HTTP 301 redirect, or false for a temporary HTTP 302 redirect
 */

const readRedirectsFile = (redirectsPath) => {
    return fs.readFile(redirectsPath, 'utf-8')
        .catch((err) => {
            if (err.code === 'ENOENT') {
                return Promise.resolve([]);
            }

            if (errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new errors.NotFoundError({
                err: err
            });
        });
};

/**
 *
 * @param {String} content serialized JSON or YAML configuration
 * @param {String} ext one of `.json` or `.yaml` extensions
 *
 * @returns {RedirectConfig[]} of parsed redirect config objects
 */
const parseRedirectsFile = (content, ext) => {
    if (ext === '.json') {
        let redirects;

        try {
            redirects = JSON.parse(content);
        } catch (err) {
            throw new errors.BadRequestError({
                message: i18n.t('errors.general.jsonParse', {context: err.message})
            });
        }

        return redirects;
    }

    if (ext === '.yaml') {
        let redirects = [];
        let configYaml = yaml.load(content);

        // yaml.load passes almost every yaml code.
        // Because of that, it's hard to detect if there's an error in the file.
        // But one of the obvious errors is the plain string output.
        // Here we check if the user made this mistake.
        if (typeof configYaml === 'string') {
            throw new errors.BadRequestError({
                message: i18n.t('errors.api.redirects.yamlParse'),
                help: 'https://ghost.org/docs/themes/routing/#redirects'
            });
        }

        /**
         * 302: Temporary redirects
         */
        for (const redirect in configYaml['302']) {
            redirects.push({
                from: redirect,
                to: configYaml['302'][redirect],
                permanent: false
            });
        }

        /**
         * 301: Permanent redirects
         */
        for (const redirect in configYaml['301']) {
            redirects.push({
                from: redirect,
                to: configYaml['301'][redirect],
                permanent: true
            });
        }

        return redirects;
    }

    throw new errors.IncorrectUsageError();
};

const createRedirectsFilePath = (ext) => {
    return path.join(config.getContentPath('data'), `redirects${ext}`);
};

const getRedirectsFilePath = async () => {
    const yamlPath = createRedirectsFilePath('.yaml');
    const jsonPath = createRedirectsFilePath('.json');

    const yamlExists = await fs.pathExists(yamlPath);

    if (yamlExists) {
        return yamlPath;
    }

    const jsonExist = await fs.pathExists(jsonPath);

    if (jsonExist) {
        return jsonPath;
    }

    return null;
};

const getCurrentRedirectsFilePathSync = () => {
    const yamlPath = createRedirectsFilePath('.yaml');
    const jsonPath = createRedirectsFilePath('.json');

    if (fs.existsSync(yamlPath)) {
        return yamlPath;
    }

    if (fs.existsSync(jsonPath)) {
        return jsonPath;
    }

    return null;
};

const getBackupRedirectsFilePath = (filePath) => {
    const {dir, name, ext} = path.parse(filePath);

    return path.join(dir, `${name}-${moment().format('YYYY-MM-DD-HH-mm-ss')}${ext}`);
};

// '.json' is the default here because 'yaml' redirects file format is added later in v3.
// @TODO: change the default to '.yaml' in v4. It may be even removed if '.json' format is deprecated.
const setFromFilePath = (filePath, ext = '.json') => {
    return getRedirectsFilePath()
        .then((redirectsFilePath) => {
            if (!redirectsFilePath) {
                return null;
            }

            const backupRedirectsPath = getBackupRedirectsFilePath(redirectsFilePath);

            return fs.pathExists(backupRedirectsPath)
                .then((backupExists) => {
                    if (!backupExists) {
                        return null;
                    }

                    return fs.unlink(backupRedirectsPath);
                })
                .then(() => {
                    return fs.move(redirectsFilePath, backupRedirectsPath);
                });
        })
        .then(() => {
            return readRedirectsFile(filePath)
                .then((content) => {
                    return parseRedirectsFile(content, ext);
                })
                .then((content) => {
                    validation.validate(content);

                    if (ext === '.json') {
                        return fs.writeFile(createRedirectsFilePath('.json'), JSON.stringify(content), 'utf-8');
                    }

                    if (ext === '.yaml') {
                        return fs.copy(filePath, createRedirectsFilePath('.yaml'));
                    }
                });
        });
};

// @TODO: When yaml has been changed as the default redirects file format,
// change this like `const defaultRedirectsContent = ''`.
// Default json content is []. But the default YAML content is an empty string.
const defaultJsonFileContent = [];

const get = () => {
    return getRedirectsFilePath().then((filePath) => {
        if (filePath === null) {
            return defaultJsonFileContent;
        }

        return readRedirectsFile(filePath).then((content) => {
            return path.extname(filePath) === '.json'
                ? parseRedirectsFile(content, '.json')
                : content;
        });
    });
};

/**
 * Syncrounously loads current oncifg file and parses it's content
 *
 * @returns {{RedirectConfig[]}} of parsed redirect configurations
 */
const loadRedirectsFile = () => {
    const filePath = getCurrentRedirectsFilePathSync();

    if (filePath === null) {
        return defaultJsonFileContent;
    }

    const content = fs.readFileSync(filePath);

    return parseRedirectsFile(content, path.extname(filePath));
};

module.exports.get = get;
module.exports.setFromFilePath = setFromFilePath;
module.exports.getRedirectsFilePath = getRedirectsFilePath;
module.exports.loadRedirectsFile = loadRedirectsFile;
