/* Recommendations helper
 * Usage as block: `{{#recommendations}}{{/recommendations}}`
 * Available options: limit, order, filter
 */
const {config, api, prepareContextResource} = require('../services/proxy');
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
 *
 * @param {object} options
 * @returns {Promise<any>}
 */
module.exports = async function recommendations(options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    const data = createFrame(options.data);
    const apiOptions = options.hash;

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
