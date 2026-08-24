module.exports = {
  async init({ getJobsService }) {
    const debug = require('@tryghost/debug')('mediaInliner');
    const MediaInliner = require('./external-media-inliner');
    const ExternalMediaInlinerJob = require('./external-media-inliner-job').default;
    const logging = require('@tryghost/logging');
    const models = require('../../models');
    const adapterManager = require('../../services/adapter-manager').default;

    const mediaStorage = adapterManager.getAdapter('storage:media');
    const imageStorage = adapterManager.getAdapter('storage:images');
    const fileStorage = adapterManager.getAdapter('storage:files');

    const config = require('../../../shared/config');

    this.inliner = new MediaInliner({
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
        if (!domains || !domains.length) {
          // default domains to inline from if none are provided
          domains = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];
        }

        debug('[Inliner] Starting media inlining job for domains: ', domains);

        logging.info('[Background Job] external-media-inliner queued');
        await getJobsService().dispatch(new ExternalMediaInlinerJob({ domains }));

        return {
          status: 'success',
        };
      },
    };
  },
};
