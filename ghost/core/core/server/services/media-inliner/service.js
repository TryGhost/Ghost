module.exports = {
    async init() {
        const debug = require('@tryghost/debug')('mediaInliner');
        const MediaInliner = require('./external-media-inliner');
        const MediaInlinerJob = require('./media-inliner-job');
        const models = require('../../models');
        const jobsService = require('../jobs');
        const jobsServiceV2 = require('../jobs/v2').default;
        const labs = require('../../../shared/labs');
        const adapterManager = require('../../services/adapter-manager').default;

        const mediaStorage = adapterManager.getAdapter('storage:media');
        const imageStorage = adapterManager.getAdapter('storage:images');
        const fileStorage = adapterManager.getAdapter('storage:files');

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

        this.api = {

            startMediaInliner: async (domains) => {
                if (!domains || !domains.length) {
                    // default domains to inline from if none are provided
                    domains = [
                        'https://s3.amazonaws.com/revue',
                        'https://substackcdn.com'
                    ];
                }

                debug('[Inliner] Starting media inlining job for domains: ', domains);

                if (labs.isSet('jobsV2')) {
                    // Resolves on acceptance: the job runs in the background
                    // and its outcome never surfaces here — matching the
                    // legacy non-offloaded job below.
                    await jobsServiceV2.dispatch(new MediaInlinerJob({domains}));
                } else {
                    // @NOTE: the job is "inline" (aka non-offloaded into a thread), because usecases are currently
                    //        limited to migrational, so there is no expectations for site's availability etc.
                    await jobsService.addJob({
                        name: 'external-media-inliner',
                        job: (data) => {
                            return mediaInliner.inline(data.domains);
                        },
                        data: {domains},
                        offloaded: false
                    });
                }

                return {
                    status: 'success'
                };
            },

            /**
             * The inlining work itself — invoked by the MediaInlinerJob
             * handler registered in services/jobs/v2/register-handlers.js.
             * @param {string[]} domains
             */
            inline: async (domains) => {
                return mediaInliner.inline(domains);
            }
        };
    }
};
