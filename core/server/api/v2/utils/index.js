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
     *  TODO: We need to check for public context as permission stage overrides
     * the whole context object currently: https://github.com/TryGhost/Ghost/issues/10099
     */
    isContentAPI: (frame) => {
        // CASE: apiType = 'admin' for admin api
        // CASE: apiType = 'content' for content api
        // CASE: apiType = undefined if neither (e.g. internal)
        return frame.apiType === 'content' || frame.apiType === undefined;
    },

    isAdminAPIKey: (frame) => {
        return frame.options.context && Object.keys(frame.options.context).length !== 0 && frame.options.context.api_key &&
            frame.options.context.api_key.type === 'admin';
    }
};
