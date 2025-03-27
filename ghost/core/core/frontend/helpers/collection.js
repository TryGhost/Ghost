// # Get Helper
// Usage: `{{#get "posts" limit="5"}}`, `{{#get "tags" limit="all"}}`
// Fetches data from the API
const {config, api, prepareContextResource} = require('../services/proxy');
const {hbs} = require('../services/handlebars');

const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    mustBeCalledAsBlock: 'The {\\{{helperName}}} helper must be called as a block. E.g. {{#{helperName}}}...{{/{helperName}}}',
    invalidResource: 'Invalid "{resource}" resource given to get helper'
};

const createFrame = hbs.handlebars.createFrame;

/**
 * ## Parse Options
 * Ensure options passed in make sense
 *
 * @param {Object} options
 * @returns {*}
 */
function parseOptions(options) {
    if (options.limit === 'all' || !options.limit) {
        return {
            limit: 3
        };
    }

    return {
        limit: options.limit
    };
}

/**
 *
 * @param {String} resource
 * @param {String} controllerName
 * @param {String} action
 * @param {Object} apiOptions
 * @returns {Promise<Object>}
 */
async function makeAPICall(resource, controllerName, action, apiOptions) {
    const controller = api[controllerName];

    let timer;

    try {
        let response;

        if (config.get('optimization:getHelper:timeout:threshold')) {
            const logLevel = config.get('optimization:getHelper:timeout:level') || 'error';
            const threshold = config.get('optimization:getHelper:timeout:threshold');

            const apiResponse = controller[action](apiOptions);

            const timeout = new Promise((resolve) => {
                timer = setTimeout(() => {
                    logging[logLevel](new errors.HelperWarning({
                        message: `{{#get}} took longer than ${threshold}ms and was aborted`,
                        code: 'ABORTED_GET_HELPER',
                        errorDetails: {
                            api: `${controllerName}.${action}`,
                            apiOptions
                        }
                    }));

                    resolve({[resource]: []});
                }, threshold);
            });

            response = await Promise.race([apiResponse, timeout]);
            clearTimeout(timer);
        } else {
            response = await controller[action](apiOptions);
        }

        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * ## Get
 * @param {string} slug
 * @param {object} options
 * @returns {Promise<any>}
 */
module.exports = async function collection(slug, options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    const self = this;
    const data = createFrame(options.data);

    let apiOptions = options.hash;

    if (!options.fn) {
        data.error = tpl(messages.mustBeCalledAsBlock, {helperName: 'collection'});
        logging.warn(data.error);
        return;
    }

    const resource = 'posts';
    const controllerName = 'postsPublic';
    const action = 'browse';

    // Parse the options we're going to pass to the API
    apiOptions = parseOptions(apiOptions);
    apiOptions.context = {member: data.member};
    apiOptions.collection = slug;

    try {
        const response = await makeAPICall(resource, controllerName, action, apiOptions);

        // prepare data properties for use with handlebars
        if (response[resource] && response[resource].length) {
            response[resource].forEach(prepareContextResource);
        }

        // block params allows the theme developer to name the data using something like
        // `{{#get "posts" as |result pageInfo|}}`
        const blockParams = [response[resource]];
        if (response.meta && response.meta.pagination) {
            response.pagination = response.meta.pagination;
            blockParams.push(response.meta.pagination);
        }

        // Call the main template function
        return options.fn(response, {
            data: data,
            blockParams: blockParams
        });
    } catch (error) {
        logging.error(error);
        data.error = error.message;
        return options.inverse(self, {data: data});
    }
};

module.exports.async = true;
