const {toPlain} = require('../../lib/common/to-plain');

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
     * @param {{id: string}} post - full post record (model or plain data);
     *   the URL service needs its status/tags/authors to route it
     * @param {0 | 1} score
     * @param {string} key - hashed uuid value
     */
    buildLink(uuid, post, score, key) {
        const postData = toPlain(post);
        let postUrl = this.#urlService.facade.getUrlForResource({...postData, type: 'posts'}, {absolute: true});

        if (postUrl.match(/\/404\//)) {
            postUrl = this.#baseURL;
        }
        return this.#withFeedbackHash(new URL(postUrl), postData.id, score, uuid, key);
    }

    /**
     * Feedback link for a post that no longer exists. Goes straight to the
     * home page — the same destination buildLink picks when the URL service
     * has no URL for the post — without asking the URL service: an id-only
     * resource can't be routed (the lazy backend rejects it as thin).
     *
     * @param {string} uuid
     * @param {string} postId
     * @param {0 | 1} score
     * @param {string} key - hashed uuid value
     */
    buildFallbackLink(uuid, postId, score, key) {
        return this.#withFeedbackHash(new URL(this.#baseURL), postId, score, uuid, key);
    }

    /**
     * @param {URL} url
     * @param {string} postId
     * @param {0 | 1} score
     * @param {string} uuid
     * @param {string} key
     */
    #withFeedbackHash(url, postId, score, uuid, key) {
        url.hash = `#/feedback/${postId}/${score}/?uuid=${encodeURIComponent(uuid)}&key=${encodeURIComponent(key)}`;
        return url;
    }

    /**
     * Build the feedback link embedded in a newsletter. It targets the members
     * feedback redirect endpoint keyed by post id (never the slug), so it
     * survives slug/permalink changes — the endpoint resolves the post's current
     * URL at click time. uuid/key are Mailgun placeholders substituted per member.
     *
     * @param {{id: string}} post
     * @param {0 | 1} score
     * @returns {string}
     */
    buildEmailLink(post, score) {
        const {id} = toPlain(post);
        const url = new URL(this.#baseURL.href);
        url.pathname = url.pathname.replace(/\/+$/, '') + `/members/feedback/${id}/${score}/`;
        // Append placeholders by string concatenation so the %%{...}%% tokens are
        // not percent-encoded by the URL serializer (Mailgun substitutes them).
        return `${url.href}?uuid=%%{uuid}%%&key=%%{key}%%`;
    }
}

module.exports = AudienceFeedbackService;
