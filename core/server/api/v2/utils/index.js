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
        const context = frame.options && frame.options.context || {};
        // CASE: An empty context is considered public by the core/server/services/permissions/parse-context.js
        //       module, replicated here because the context is unparsed until after the permissions layer of the pipeline
        const isPublic = context.public || Object.keys(context).length === 0;

        // CASE: apiType = 'content' for HTTP Content API
        return frame.apiType === 'content' || isPublic;
    },

    isAdminAPIKey: (frame) => {
        return frame.options.context && Object.keys(frame.options.context).length !== 0 && frame.options.context.api_key &&
            frame.options.context.api_key.type === 'admin';
    }
};
