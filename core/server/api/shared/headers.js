const INVALIDATE_ALL = '/*';

const cacheInvalidate = (result, options = {}) => {
    let value = options.value;

    return {
        'X-Cache-Invalidate': value || INVALIDATE_ALL
    };
};

const disposition = {
    csv(result, options = {}) {
        return {
            'Content-Disposition': options.value,
            'Content-Type': 'text/csv'
        };
    },

    json(result, options = {}) {
        return {
            'Content-Disposition': options.value,
            'Content-Type': 'application/json',
            'Content-Length': JSON.stringify(result).length
        };
    },

    yaml(result, options = {}) {
        return {
            'Content-Disposition': options.value,
            'Content-Type': 'application/yaml',
            'Content-Length': JSON.stringify(result).length
        };
    }
};

module.exports = {
    get(result, config = {}) {
        let headers = {};

        if (config.disposition) {
            Object.assign(headers, disposition[config.disposition.type](result, config.disposition));
        }

        if (config.cacheInvalidate) {
            Object.assign(headers, cacheInvalidate(result, config.cacheInvalidate));
        }

        return headers;
    }
};
