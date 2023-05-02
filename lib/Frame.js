const debug = require('@tryghost/debug')('frame');
const _ = require('lodash');

/**
 * @description The "frame" holds all information of a request.
 *
 * Each party can modify the frame by reference.
 * A request hits a lot of stages in the API implementation and that's why modification by reference was the
 * easiest to use. We always have access to the original input, we never loose track of it.
 */
class Frame {
    constructor(obj = {}) {
        this.original = obj;

        /**
         * options:     Query params, url params, context and custom options
         * data:        Body or if the ctrl wants query/url params inside body
         * user:        Logged in user
         * file:        Uploaded file
         * files:       Uploaded files
         * apiType:     Content or admin api access
         * docName:     The endpoint name, e.g. "posts"
         * method:      The method name, e.g. "browse"
         */
        this.options = {};
        this.data = {};
        this.user = {};
        this.file = {};
        this.files = [];
        this.apiType = null;
        this.docName = null;
        this.method = null;
        this.response = null;
    }

    /**
     * @description Configure the frame.
     *
     * If you instantiate a new frame, all the data you pass in, land in `this.original`. This is helpful
     * for debugging to see what the original input was.
     *
     * This function will prepare the incoming data for further processing.
     * Based on the API ctrl implemented, this fn will pick allowed properties to either options or data.
     */
    configure(apiConfig) {
        debug('configure');

        if (apiConfig.options) {
            if (typeof apiConfig.options === 'function') {
                apiConfig.options = apiConfig.options(this);
            }

            if (Object.prototype.hasOwnProperty.call(this.original, 'query')) {
                Object.assign(this.options, _.pick(this.original.query, apiConfig.options));
            }

            if (Object.prototype.hasOwnProperty.call(this.original, 'params')) {
                Object.assign(this.options, _.pick(this.original.params, apiConfig.options));
            }

            if (Object.prototype.hasOwnProperty.call(this.original, 'options')) {
                Object.assign(this.options, _.pick(this.original.options, apiConfig.options));
            }
        }

        this.options.context = this.original.context;

        if (this.original.body && Object.keys(this.original.body).length) {
            this.data = _.cloneDeep(this.original.body);
        } else {
            if (apiConfig.data) {
                if (typeof apiConfig.data === 'function') {
                    apiConfig.data = apiConfig.data(this);
                }

                if (Object.prototype.hasOwnProperty.call(this.original, 'query')) {
                    Object.assign(this.data, _.pick(this.original.query, apiConfig.data));
                }

                if (Object.prototype.hasOwnProperty.call(this.original, 'params')) {
                    Object.assign(this.data, _.pick(this.original.params, apiConfig.data));
                }

                if (Object.prototype.hasOwnProperty.call(this.original, 'options')) {
                    Object.assign(this.data, _.pick(this.original.options, apiConfig.data));
                }
            }
        }

        this.user = this.original.user;
        this.file = this.original.file;
        this.files = this.original.files;

        debug('original', this.original);
        debug('options', this.options);
        debug('data', this.data);
    }
}

module.exports = Frame;
