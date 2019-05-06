const debug = require('ghost-ignition').debug('api:shared:headers');
const Promise = require('bluebird');
const INVALIDATE_ALL = '/*';

const cacheInvalidate = (result, options = {}) => {
    let value = options.value;

    return {
        'X-Cache-Invalidate': value || INVALIDATE_ALL
    };
};

const disposition = {
    /**
     * @description Generate CSV header.
     *
     * @param {Object} result - API response
     * @param {Object} options
     * @return {Object}
     */
    csv(result, options = {}) {
        let value = options.value;

        if (typeof options.value === 'function') {
            value = options.value();
        }

        return {
            'Content-Disposition': `Attachment; filename="${value}"`,
            'Content-Type': 'text/csv'
        };
    },

    /**
     * @description Generate JSON header.
     *
     * @param {Object} result - API response
     * @param {Object} options
     * @return {Object}
     */
    json(result, options = {}) {
        return {
            'Content-Disposition': `Attachment; filename="${options.value}"`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(result))
        };
    },

    /**
     * @description Generate YAML header.
     *
     * @param {Object} result - API response
     * @param {Object} options
     * @return {Object}
     */
    yaml(result, options = {}) {
        return {
            'Content-Disposition': `Attachment; filename="${options.value}"`,
            'Content-Type': 'application/yaml',
            'Content-Length': Buffer.byteLength(JSON.stringify(result))
        };
    },

    /**
     * @description Content Disposition Header
     *
     * Create a header that invokes the 'Save As' dialog in the browser when exporting the database to file. The 'filename'
     * parameter is governed by [RFC6266](http://tools.ietf.org/html/rfc6266#section-4.3).
     *
     * For encoding whitespace and non-ISO-8859-1 characters, you MUST use the "filename*=" attribute, NOT "filename=".
     * Ideally, both. Examples: http://tools.ietf.org/html/rfc6266#section-5
     *
     * We'll use ISO-8859-1 characters here to keep it simple.
     *
     * @see http://tools.ietf.org/html/rfc598
     */
    file(result, options = {}) {
        return Promise.resolve()
            .then(() => {
                let value = options.value;

                if (typeof options.value === 'function') {
                    value = options.value();
                }

                return value;
            })
            .then((filename) => {
                return {
                    'Content-Disposition': `Attachment; filename="${filename}"`
                };
            });
    }
};

module.exports = {
    /**
     * @description Get header based on ctrl configuration.
     *
     * @param {Object} result - API response
     * @param {Object} apiConfig
     * @return {Promise}
     */
    get(result, apiConfig = {}) {
        let headers = {};

        return Promise.resolve()
            .then(() => {
                let header;

                if (apiConfig.disposition) {
                    header = disposition[apiConfig.disposition.type](result, apiConfig.disposition);
                }

                return header;
            })
            .then((header) => {
                if (header) {
                    Object.assign(headers, header);
                }
            })
            .then(() => {
                let header;

                if (apiConfig.cacheInvalidate) {
                    header = cacheInvalidate(result, apiConfig.cacheInvalidate);
                }

                return header;
            })
            .then((header) => {
                if (header) {
                    Object.assign(headers, header);
                }
            })
            .then(() => {
                debug(headers);
                return headers;
            });
    }
};
