/* Recommendations helper
 * Usage: `{{recommendations}}`
 *
 * Renders the template defined in `tpl/recommendations.hbs`
 * Can be overridden by themes by uploading a partial under `partials/recommendations.hbs`
 *
 * Available options: limit, order, filter, page
 */
const {config, api, prepareContextResource, settingsCache} = require('../services/proxy');
const {templates, hbs} = require('../services/handlebars');

const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

const createFrame = hbs.handlebars.createFrame;

/**
 * Call the Recommendation Content API's browse method
 * @param {Object} apiOptions
 * @returns {Promise<Object>}
 */
async function fetchRecommendations(apiOptions) {
    let timer;

    try {
        const controller = api.recommendationsPublic;
        let response;

        const logLevel = config.get('optimization:getHelper:timeout:level') || 'error';
        const threshold = config.get('optimization:getHelper:timeout:threshold') || 5000;
        const apiResponse = controller.browse(apiOptions);

        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => {
                logging[logLevel](new errors.HelperWarning({
                    message: `{{#recommendations}} took longer than ${threshold}ms and was aborted`,
                    code: 'ABORTED_RECOMMENDATIONS_HELPER',
                    errorDetails: {
                        api: 'recommendationsPublic.browse',
                        apiOptions
                    }
                }));

                resolve({recommendations: []});
            }, threshold);
        });

        response = await Promise.race([apiResponse, timeout]);
        clearTimeout(timer);

        return response;
    } catch (err) {
        clearTimeout(timer);
        throw err;
    }
}

/**
 * Parse Options
 *
 * @param {Object} options
 * @returns {*}
 */
function parseOptions(options) {
    let limit = options.limit ?? 5;
    let order = options.order ?? 'created_at desc';
    let filter = options.filter ?? '';
    let page = options.page ?? 1;

    return {
        limit,
        order,
        filter,
        page
    };
}

/**
 *
 * @param {object} options
 * @returns {Promise<any>}
 */
module.exports = async function recommendations(options) {
    const recommendationsEnabled = settingsCache.get('recommendations_enabled');

    if (!recommendationsEnabled) {
        return;
    }

    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    const data = createFrame(options.data);
    let apiOptions = options.hash;
    apiOptions = parseOptions(apiOptions);

    try {
        const response = await fetchRecommendations(apiOptions);

        if (response.recommendations && response.recommendations.length) {
            response.recommendations.forEach(prepareContextResource);
        }

        if (response.meta && response.meta.pagination) {
            response.pagination = response.meta.pagination;
        }

        return templates.execute('recommendations', response, {data});
    } catch (error) {
        logging.error(error);
        return null;
    }
};

module.exports.async = true;
