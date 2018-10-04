const _ = require('lodash');

class Frame {
    constructor(obj) {
        this.original = obj;

        this.options = {};
        this.data = {};
        this.user = {};
        this.file = {};
        this.files = [];
    }

    configure(apiConfig) {
        if (apiConfig.options) {
            if (typeof apiConfig.options === 'function') {
                apiConfig.options = apiConfig.options(this);
            }

            if (this.original.hasOwnProperty('query')) {
                Object.assign(this.options, _.pick(this.original.query, apiConfig.options));
            }

            if (this.original.hasOwnProperty('params')) {
                Object.assign(this.options, _.pick(this.original.params, apiConfig.options));
            }

            if (this.original.hasOwnProperty('options')) {
                Object.assign(this.options, _.pick(this.original.options, apiConfig.options));
            }
        }

        this.options.context = this.original.context;

        if (this.original.body) {
            this.data = this.original.body;
        } else {
            if (apiConfig.data) {
                if (typeof apiConfig.data === 'function') {
                    apiConfig.data = apiConfig.data(this);
                }

                if (this.original.hasOwnProperty('query')) {
                    Object.assign(this.data, _.pick(this.original.query, apiConfig.data));
                }

                if (this.original.hasOwnProperty('params')) {
                    Object.assign(this.data, _.pick(this.original.params, apiConfig.data));
                }

                if (this.original.hasOwnProperty('options')) {
                    Object.assign(this.data, _.pick(this.original.options, apiConfig.data));
                }
            }
        }

        this.user = this.original.user;
        this.file = this.original.file;
        this.files = this.original.files;
    }
}

module.exports = Frame;
