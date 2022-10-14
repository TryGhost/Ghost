class AudienceFeedbackService {
    /** @type URL */
    #baseURL;
    /**
     * @param {object} deps
     * @param {object} deps.config
     * @param {URL} deps.config.baseURL
     */
    constructor(deps) {
        this.#baseURL = deps.config.baseURL;
    }
    /**
     * @param {string} uuid
     * @param {string} postId
     * @param {0 | 1} score
     */
    buildLink(uuid, postId, score) {
        const url = new URL(this.#baseURL);
        url.searchParams.set('action', 'feedback');
        url.searchParams.set('post', postId);
        url.searchParams.set('uuid', uuid);
        url.searchParams.set('score', `${score}`);

        return url;
    }
}

module.exports = AudienceFeedbackService;
