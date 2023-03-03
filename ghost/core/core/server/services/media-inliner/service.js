module.exports = {
    async init() {
        const debug = require('@tryghost/debug')('mediaInliner');
        const MediaInliner = require('@tryghost/external-media-inliner');
        const models = require('../../models');

        const mediaStorage = require('../../adapters/storage').getStorage('media');
        const imageStorage = require('../../adapters/storage').getStorage('images');
        const fileStorage = require('../../adapters/storage').getStorage('files');

        const config = require('../../../shared/config');

        const mediaInliner = new MediaInliner({
            PostModel: models.Post,
            getMediaStorage: (extension) => {
                if (config.get('uploads').images.extensions.includes(extension)) {
                    return imageStorage;
                } else if (config.get('uploads').media.extensions.includes(extension)) {
                    return mediaStorage;
                } else if (config.get('uploads').files.extensions.includes(extension)) {
                    return fileStorage;
                } else {
                    return null;
                }
            }
        });

        this.api = {

            startMediaInliner: (domains) => {
                if (!domains || !domains.length) {
                    // default domains to inline from if none are provided
                    domains = [
                        'https://s3.amazonaws.com/revue',
                        'https://substackcdn.com'
                    ];
                }

                debug('[Inliner] Starting media inlining job for domains: ', domains);

                // @NOTE: the inlining should become an offloaded job
                // startMediaInliner: mediaInliner.inlineMedia
                mediaInliner.inline(domains);

                return {
                    status: 'success'
                };
            }
        };
    }
};
