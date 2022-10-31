class AudienceFeedbackService {
    /** @type URL */
    #baseURL;
    /** @type {Object} */
    #urlService;
    /**
     * @param {object} deps
     * @param {object} deps.config
     * @param {URL} deps.config.baseURL
     * @param {object} deps.urlService
     */
    constructor(deps) {
        this.#baseURL = deps.config.baseURL;
        this.#urlService = deps.urlService;
    }
    /**
     * @param {string} uuid
     * @param {string} postId
     * @param {0 | 1} score
     */
    buildLink(uuid, postId, score) {
        let postUrl = this.#urlService.getUrlByResourceId(postId, {absolute: true});

        if (postUrl.match(/\/404\//)) {
            postUrl = this.#baseURL;
        }
        const url = new URL(postUrl);
        url.hash = `#/feedback/${postId}/${score}/?uuid=${encodeURIComponent(uuid)}`;
        return url;
    }
}

module.exports = AudienceFeedbackService;
