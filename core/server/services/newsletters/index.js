const NewslettersService = require('./service.js');

/**
 * @returns {NewslettersService} instance of the NewslettersService
 */
const getNewslettersServiceInstance = ({NewsletterModel}) => {
    return new NewslettersService({NewsletterModel});
};

module.exports = getNewslettersServiceInstance;
