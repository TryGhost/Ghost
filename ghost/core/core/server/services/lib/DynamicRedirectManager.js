const express = require('express');
const {parse: parseURL, format: formatURL} = require('url');
const {parse: parseQuerystring, stringify: formatQuerystring} = require('querystring');

class DynamicRedirectManager {
    /**
     * @param {object} config
     * @param {number} config.permanentMaxAge
     * @param {function} config.getSubdirectoryURL
     */
    constructor({permanentMaxAge, getSubdirectoryURL}) {
        /** @private */
        this.permanentMaxAge = permanentMaxAge;

        this.getSubdirectoryURL = getSubdirectoryURL;

        /** @private */
        this.router = express.Router();
        /** @private @type {Object.<string, {fromRegex: RegExp, to: string, options: {permanent: boolean}}>} */
        this.redirects = {};

        this.handleRequest = this.handleRequest.bind(this);
    }

    /**
     * @private
     * @param {string} string
     * @returns {RegExp}
     */
    buildRegex(string) {
        let flags = '';

        if (string.startsWith('/') && string.endsWith('/i')) {
            string = string.slice(1, -2);
            flags += 'i';
        }

        if (string.endsWith('/')) {
            string = string.slice(0, -1);
        }

        if (!string.endsWith('$')) {
            string += '/?$';
        }

        return new RegExp(string, flags);
    }

    /**
     * @private
     * @param {string} redirectId
     * @returns {void}
     */
    setupRedirect(redirectId) {
        const {fromRegex, to, options: {permanent}} = this.redirects[redirectId];

        this.router.get(fromRegex, (req, res) => {
            const maxAge = permanent ? this.permanentMaxAge : 0;
            const toURL = parseURL(to);
            const toURLParams = parseQuerystring(toURL.query);
            const currentURL = parseURL(req.url);
            const currentURLParams = parseQuerystring(currentURL.query);
            const params = Object.assign({}, currentURLParams, toURLParams);
            const search = formatQuerystring(params);

            toURL.pathname = currentURL.pathname.replace(fromRegex, toURL.pathname);
            toURL.search = search !== '' ? `?${search}` : null;

            /**
             * Only if the url is internal should we prepend the Ghost subdirectory
             * @see https://github.com/TryGhost/Ghost/issues/10776
             */
            if (!toURL.hostname) {
                toURL.pathname = this.getSubdirectoryURL(toURL.pathname);
            }

            res.set({
                'Cache-Control': `public, max-age=${maxAge}`
            });

            res.redirect(permanent ? 301 : 302, formatURL(toURL));
        });
    }

    /**
     * @param {string} from
     * @param {string} to
     * @param {object} [options]
     * @param {boolean} [options.permanent]
     *
     * @returns {string} The redirect ID
     */
    addRedirect(from, to, options = {}) {
        try {
            // encode "from" only if it's not a regex
            try {
                new RegExp(from);
            } catch (e) {
                from = encodeURI(from);
            }

            const fromRegex = this.buildRegex(from);
            const redirectId = from;
            
            this.redirects[redirectId] = {
                fromRegex,
                to,
                options
            };

            this.setupRedirect(redirectId);

            return redirectId;
        } catch (error) {
            if (error.message.match(/Invalid regular expression/gi)) {
                return null;
            }

            throw error;
        }
    }

    /**
     * @param {string} redirectId
     * @returns {void}
     */
    removeRedirect(redirectId) {
        delete this.redirects[redirectId];

        this.router = express.Router();
        Object.keys(this.redirects).forEach(id => this.setupRedirect(id));

        return;
    }

    /**
     * @returns {void}
     */
    removeAllRedirects() {
        this.redirects = {};
        this.router = express.Router();
    }

    /**
     * @param {express.Request} req
     * @param {express.Response} res
     * @param {express.NextFunction} next
     *
     * @returns {void}
     */
    handleRequest(req, res, next) {
        this.router(req, res, next);
    }
}

module.exports = DynamicRedirectManager;
