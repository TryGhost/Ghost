const errors = require('@tryghost/errors');

class MediaInlinerService {
  #inliner;
  #jobsService;
  #logging;
  #debug;

  constructor({ inliner, jobsService, logging, debug }) {
    this.#inliner = inliner;
    this.#jobsService = jobsService;
    this.#logging = logging;
    this.#debug = debug;
  }

  async inline(domains) {
    return this.#inliner.inline(domains);
  }

  async startMediaInliner(domains) {
    if (!domains || !domains.length) {
      // default domains to inline from if none are provided
      domains = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];
    }

    this.#debug('[Inliner] Starting media inlining job for domains: ', domains);

    // @NOTE: the job is "inline" (aka non-offloaded into a thread), because usecases are currently
    //        limited to migrational, so there is no expectations for site's availability etc.
    this.#logging.info('[Background Job] external-media-inliner queued');
    await this.#jobsService.addJob({
      name: 'external-media-inliner',
      job: async (data) => {
        const startedAt = Date.now();
        this.#logging.info('[Background Job] external-media-inliner started');
        try {
          const result = await this.inline(data.domains);
          this.#logging.info(
            `[Background Job] external-media-inliner completed in ${Date.now() - startedAt}ms`,
          );
          return result;
        } catch (err) {
          this.#logging.error(
            err,
            `[Background Job] external-media-inliner failed after ${Date.now() - startedAt}ms`,
          );
          throw err;
        }
      },
      data: { domains },
      offloaded: false,
    });

    return {
      status: 'success',
    };
  }
}

let instance;

module.exports = {
  MediaInlinerService,

  async init() {
    const debug = require('@tryghost/debug')('mediaInliner');
    const MediaInliner = require('./external-media-inliner');
    const logging = require('@tryghost/logging');
    const models = require('../../models');
    const jobsService = require('../jobs');
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
      },
    });

    instance = new MediaInlinerService({
      inliner: mediaInliner,
      jobsService,
      logging,
      debug,
    });

    this.api = {
      startMediaInliner: (domains) => instance.startMediaInliner(domains),
    };
  },

  getInstance() {
    if (!instance) {
      throw new errors.IncorrectUsageError({
        message: 'Media inliner service used before init(). Call init() from boot first.',
      });
    }
    return instance;
  },
};
