module.exports = class MentionController {
    async init() {}
    /**
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {Promise<Page<Mention>>}
     */
    async browse(/*frame*/) {
        return {
            data: [{
                thing: true
            }],
            meta: {
                pagination: {
                    page: 1,
                    limit: 'all',
                    pages: 1,
                    total: 1,
                    next: null,
                    prev: null
                }
            }
        };
    }
};
