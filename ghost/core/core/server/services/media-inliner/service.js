module.exports = {
    async init() {
        const debug = require('@tryghost/debug')('mediaInliner');

        this.api = {
            // @NOTE: the inlining should become an offloaded job
            // startMediaInliner: mediaInliner.inlineMedia
            startMediaInliner: () => {
                debug('[Inliner] Starting media inlining job');
                return {
                    status: 'success'
                };
            }
        };
    }
};
