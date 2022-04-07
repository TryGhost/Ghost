class NewslettersService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.NewsletterModel
     */
    constructor({NewsletterModel}) {
        this.NewsletterModel = NewsletterModel;
    }

    /**
     *
     * @param {Object} options browse options
     * @returns
     */
    async browse(options) {
        let newsletters = await this.NewsletterModel.findAll(options);

        return newsletters.toJSON();
    }
}

module.exports = NewslettersService;

