module.exports = {
    get permissions() {
        return require('./permissions');
    },

    get serializers() {
        return require('./serializers');
    },

    get validators() {
        return require('./validators');
    },

    /**
     * @description Does the request access the Content API?
     *
     * Each controller is either for the Content or for the Admin API.
     * When Ghost registers each controller, it currently passes a String "content" if the controller
     * is a Content API implementation -  see index.js file.
     *
     * @TODO: Move this helper function into a utils.js file.
     * @param {import('@tryghost/api-framework').Frame} frame
     * @return {boolean}
     */
    isContentAPI: (frame) => {
        return frame.apiType === 'content';
    },

    /**
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {boolean}
     */
    isMembersAPI: (frame) => {
        return frame.apiType === 'members';
    },

    /**
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {boolean}
     */
    isInternal: (frame) => {
        return frame.options.context && frame.options.context.internal;
    },

    /**
     * @description Returns true if the request is a preview request.
     * @param {import('@tryghost/api-framework').Frame} frame
     * @returns {boolean}
     */
    isPreview: (frame) => {
        return frame.isPreview === true;
    }
};
