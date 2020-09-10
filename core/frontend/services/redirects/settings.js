const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const yaml = require('js-yaml');

const validation = require('./validation');

const config = require('../../../shared/config');
const {i18n} = require('../../../server/lib/common');
const errors = require('@tryghost/errors');

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
        let configYaml = yaml.safeLoad(content);

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

const getCurrentRedirectsFilePath = async () => {
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

const setFromFilePath = (filePath, ext = '.json') => {
    return getCurrentRedirectsFilePath()
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

const defaultJsonFileContent = [];

const get = () => {
    return getCurrentRedirectsFilePath().then((filePath) => {
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

module.exports.get = get;
module.exports.setFromFilePath = setFromFilePath;
module.exports.getCurrentRedirectsFilePath = getCurrentRedirectsFilePath;
module.exports.getCurrentRedirectsFilePathSync = getCurrentRedirectsFilePathSync;
module.exports.parseRedirectsFile = parseRedirectsFile;
