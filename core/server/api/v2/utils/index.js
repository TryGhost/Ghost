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

    isContentAPI: (frame) => {
        return frame.apiType === 'content';
    },

    isAdminAPIKey: (frame) => {
        return frame.options.context && Object.keys(frame.options.context).length !== 0 && frame.options.context.api_key &&
            frame.options.context.api_key.type === 'admin';
    }
};
