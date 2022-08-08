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
     * @param {Object} frame
     * @return {boolean}
     */
    isContentAPI: (frame) => {
        return frame.apiType === 'content';
    },

    isMembersAPI: (frame) => {
        return frame.apiType === 'members';
    },

    isInternal: (frame) => {
        return frame.options.context && frame.options.context.internal;
    }
};
