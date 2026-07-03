const debug = require('@tryghost/debug')('mediaInliner');
const jobQueue = require('../jobs/queue').default;
const ExternalMediaInlinerJob = require('./jobs/external-media-inliner-job').default;

const DEFAULT_DOMAINS = [
    'https://s3.amazonaws.com/revue',
    'https://substackcdn.com'
];

module.exports = {
    api: {
        startMediaInliner: async (domains) => {
            if (!domains || !domains.length) {
                // default domains to inline from if none are provided
                domains = DEFAULT_DOMAINS;
            }

            debug('[Inliner] Starting media inlining job for domains: ', domains);

            await jobQueue.dispatch(new ExternalMediaInlinerJob({domains}));

            return {
                status: 'success'
            };
        }
    },

    async init() {
        const MediaInliner = require('./external-media-inliner');
        const models = require('../../models');

        const mediaStorage = require('../../adapters/storage').getStorage('media');
        const imageStorage = require('../../adapters/storage').getStorage('images');
        const fileStorage = require('../../adapters/storage').getStorage('files');

        const config = require('../../../shared/config');

        const mediaInliner = new MediaInliner({
            PostModel: models.Post,
            TagModel: models.Tag,
            UserModel: models.User,
            PostMetaModel: models.PostsMeta,
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

        // Own pool: inlining crawls every post and can run for hours; it must
        // not occupy the default queue's slots, starving the recurring jobs.
        jobQueue.handle(ExternalMediaInlinerJob, job => mediaInliner.inline(job.data.domains), {concurrency: 1});
    }
};
