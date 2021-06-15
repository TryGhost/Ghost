const url = require('url');
const debug = require('@tryghost/debug')('api:shared:headers');
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
     * @param {Object} apiConfigHeaders
     * @param {Object} frame
     * @return {Promise}
     */
    async get(result, apiConfigHeaders = {}, frame) {
        let headers = {};

        if (apiConfigHeaders.disposition) {
            const dispositionHeader = await disposition[apiConfigHeaders.disposition.type](result, apiConfigHeaders.disposition);

            if (dispositionHeader) {
                Object.assign(headers, dispositionHeader);
            }
        }

        if (apiConfigHeaders.cacheInvalidate) {
            const cacheInvalidationHeader = cacheInvalidate(result, apiConfigHeaders.cacheInvalidate);

            if (cacheInvalidationHeader) {
                Object.assign(headers, cacheInvalidationHeader);
            }
        }

        const locationHeaderDisabled = apiConfigHeaders && apiConfigHeaders.location === false;
        const hasFrameData = frame
            && (frame.method === 'add')
            && result[frame.docName]
            && result[frame.docName][0]
            && result[frame.docName][0].id;

        if (!locationHeaderDisabled && hasFrameData) {
            const protocol = (frame.original.url.secure === false) ? 'http://' : 'https://';
            const resourceId = result[frame.docName][0].id;

            let locationURL = url.resolve(`${protocol}${frame.original.url.host}`,frame.original.url.pathname);
            if (!locationURL.endsWith('/')) {
                locationURL += '/';
            }
            locationURL += `${resourceId}/`;

            const locationHeader = {
                Location: locationURL
            };

            Object.assign(headers, locationHeader);
        }

        debug(headers);
        return headers;
    }
};
