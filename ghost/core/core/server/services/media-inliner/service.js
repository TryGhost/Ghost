const MediaInlinerJob = require('./media-inliner-job').default;

const DEFAULT_DOMAINS = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];

let mediaInliner;

module.exports = {
  async init() {
    const MediaInliner = require('./external-media-inliner');
    const models = require('../../models');
    const adapterManager = require('../../services/adapter-manager').default;

    const mediaStorage = adapterManager.getAdapter('storage:media');
    const imageStorage = adapterManager.getAdapter('storage:images');
    const fileStorage = adapterManager.getAdapter('storage:files');

    const config = require('../../../shared/config');

    mediaInliner = new MediaInliner({
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
      },
    });

    this.api = {
      startMediaInliner: async (domains) => {
        const debug = require('@tryghost/debug')('mediaInliner');
        const jobLogging = require('../jobs/job-logging');
        const jobsService = require('../jobs-service').getInstance();

        if (!domains || !domains.length) {
          domains = DEFAULT_DOMAINS;
        }

        debug('[Inliner] Starting media inlining job for domains: ', domains);

        jobLogging.info('[Background Job] external-media-inliner queued');
        await jobsService.dispatch(new MediaInlinerJob({ domains }));

        return {
          status: 'success',
        };
      },
    };
  },

  inline(domains) {
    return mediaInliner.inline(domains);
  },
};
