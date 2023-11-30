const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    jsonParse: 'Could not parse JSON: {context}.',
    yamlParse: 'Could not parse YAML: {context}.',
    yamlInvalid: 'YAML input is invalid. Check the contents of your YAML file.',
    redirectsHelp: 'https://ghost.org/docs/themes/routing/#redirects',
    redirectsRegister: 'Could not register custom redirects.'
};

/**
 * Redirect configuration object
 * @typedef {Object} RedirectConfig
 * @property {String} from - Defines the relative incoming URL or pattern (regex)
 * @property {String} to - Defines where the incoming traffic should be redirected to, which can be a static URL, or a dynamic value using regex (example: "to": "/$1/")
 * @property {boolean} [permanent] - Can be defined with true for a permanent HTTP 301 redirect, or false for a temporary HTTP 302 redirect
 */

/**
 * @param {string} redirectsPath
 * @returns {Promise<string>}
 */
const readRedirectsFile = async (redirectsPath) => {
    try {
        return await fs.readFile(redirectsPath, 'utf-8');
    } catch (err) {
        if (err.code === 'ENOENT') {
            return '';
        }

        if (errors.utils.isGhostError(err)) {
            throw err;
        }

        throw new errors.NotFoundError({
            err: err
        });
    }
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
                message: tpl(messages.jsonParse, {context: err.message})
            });
        }

        return redirects;
    }

    if (ext === '.yaml') {
        let redirects = [];
        let configYaml;

        try {
            configYaml = yaml.load(content);
        } catch (err) {
            throw new errors.BadRequestError({
                message: tpl(messages.yamlParse, {context: err.message})
            });
        }

        if (typeof configYaml !== 'object' || configYaml === null) {
            throw new errors.BadRequestError({
                message: tpl(messages.yamlInvalid),
                help: tpl(messages.redirectsHelp)
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

/**
 * @typedef {object} IRedirectManager
 */

class CustomRedirectsAPI {
    /**
     * @param {object} config
     * @param {string} config.basePath
     * @param {Function} config.validate - validates redirects configuration
     * @param {Function} config.getBackupFilePath
     * @param {IRedirectManager} config.redirectManager
     */
    constructor({basePath, validate, redirectManager, getBackupFilePath}) {
        /** @private */
        this.basePath = basePath;

        /** @private */
        this.redirectManager = redirectManager;

        /** @private */
        this.validate = validate;

        /** @private */
        this.getBackupFilePath = getBackupFilePath;
    }

    async init() {
        // NOTE: the try/catch block here is due to possible breaking change for existing misconfigured
        //       instances in the wild. Would be a good idea to remove it during v5 migration to enforce
        //       fail-fast initialization.
        try {
            const filePath = await this.getRedirectsFilePath();

            if (filePath !== null) {
                const content = await readRedirectsFile(filePath);
                const ext = path.extname(filePath);
                const redirects = parseRedirectsFile(content, ext);
                this.validate(redirects);

                this.redirectManager.removeAllRedirects();
                for (const redirect of redirects) {
                    this.redirectManager.addRedirect(redirect.from, redirect.to, {permanent: redirect.permanent});
                }
            }
        } catch (err) {
            if (errors.utils.isGhostError(err)) {
                logging.error(err);
            } else {
                logging.error(new errors.IncorrectUsageError({
                    message: tpl(messages.redirectsRegister),
                    context: err.message,
                    help: tpl(messages.redirectsHelp),
                    err
                }));
            }
        }
    }

    /**
     * @private
     * @param {'.yaml'|'.json'} ext
     *
     * @returns {string}
     */
    createRedirectsFilePath(ext) {
        return path.join(this.basePath, `redirects${ext}`);
    }

    /**
     * @returns {Promise<string>}
     */
    async getRedirectsFilePath() {
        const yamlPath = this.createRedirectsFilePath('.yaml');
        const jsonPath = this.createRedirectsFilePath('.json');

        const yamlExists = await fs.pathExists(yamlPath);

        if (yamlExists) {
            return yamlPath;
        }

        const jsonExist = await fs.pathExists(jsonPath);

        if (jsonExist) {
            return jsonPath;
        }

        return null;
    }

    /**
     * @param {string} filePath
     * @param {'.yaml'|'.json'} [ext]
     *
     * @returns {Promise<>}
     */
    async setFromFilePath(filePath, ext = '.json') {
        const redirectsFilePath = await this.getRedirectsFilePath();

        if (redirectsFilePath) {
            const backupRedirectsPath = this.getBackupFilePath(redirectsFilePath);

            const backupExists = await fs.pathExists(backupRedirectsPath);
            if (backupExists) {
                await fs.unlink(backupRedirectsPath);
            }

            await fs.move(redirectsFilePath, backupRedirectsPath);
        }

        const content = await readRedirectsFile(filePath);
        const parsed = parseRedirectsFile(content, ext);
        this.validate(parsed);

        if (ext === '.json') {
            await fs.writeFile(this.createRedirectsFilePath('.json'), JSON.stringify(parsed), 'utf-8');
        } else if (ext === '.yaml') {
            await fs.copy(filePath, this.createRedirectsFilePath('.yaml'));
        }

        this.redirectManager.removeAllRedirects();
        for (const redirect of parsed) {
            this.redirectManager.addRedirect(redirect.from, redirect.to, {permanent: redirect.permanent});
        }
    }

    /**
     * @returns {Promise<RedirectConfig[]>}
     */
    async get() {
        const filePath = await this.getRedirectsFilePath();
        if (filePath === null) {
            return [];
        }

        const content = await readRedirectsFile(filePath);

        if (path.extname(filePath) === '.json') {
            return parseRedirectsFile(content, '.json');
        }

        return content;
    }
}

module.exports = CustomRedirectsAPI;
