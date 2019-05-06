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

    // @TODO: Remove, not used.
    isAdminAPIKey: (frame) => {
        return frame.options.context && Object.keys(frame.options.context).length !== 0 && frame.options.context.api_key &&
            frame.options.context.api_key.type === 'admin';
    }
};
