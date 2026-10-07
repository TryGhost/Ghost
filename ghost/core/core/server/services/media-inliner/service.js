const errors = require('@tryghost/errors');
const {
  isAllowedImageContent,
  isAllowedImageExtension,
  isSvgExtension,
} = require('../../lib/image/image-content');

let instance;

module.exports = {
  async init() {
    const MediaInliner = require('./external-media-inliner');
    const models = require('../../models');
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
      getMediaStorage: async (extension, fileBuffer) => {
        const imageExtensions = config.get('uploads').images.extensions;

        if (isAllowedImageExtension(extension, imageExtensions)) {
          // The extension falls back to the response's Content-Type or the
          // URL when the contents aren't recognised, so only store images
          // whose contents are an allowed format. SVGs are sanitized by the
          // inliner before they get here.
          if (
            isSvgExtension(extension) ||
            (await isAllowedImageContent(fileBuffer, imageExtensions))
          ) {
            return imageStorage;
          }

          return null;
        } else if (config.get('uploads').media.extensions.includes(extension)) {
          return mediaStorage;
        } else if (config.get('uploads').files.extensions.includes(extension)) {
          return fileStorage;
        } else {
          return null;
        }
      },
    });

    instance = mediaInliner;
  },

  getInstance() {
    if (!instance) {
      throw new errors.IncorrectUsageError({
        message: 'Media inliner used before init(). Call init() from boot first.',
      });
    }

    return instance;
  },
};
