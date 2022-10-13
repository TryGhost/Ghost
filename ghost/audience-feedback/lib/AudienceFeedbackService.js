class AudienceFeedbackService {
    /**
     * @param {string} siteUrl
     * @param {string} uuid
     * @param {string} postId
     * @param {0 | 1} score
     */
    buildLink(siteUrl, uuid, postId, score) {
        const params = new URLSearchParams({
            action: 'feedback',
            post: postId,
            uuid,
            score
        });

        return new URL(`${siteUrl}?${params.toString()}`);
    }
}

module.exports = AudienceFeedbackService;
