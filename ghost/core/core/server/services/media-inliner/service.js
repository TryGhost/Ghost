module.exports = {
  async init({ jobsService }) {
    const MediaInliner = require('./external-media-inliner');
    const { MediaInlinerService } = require('./media-inliner-service');
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

    this.service = new MediaInlinerService({ jobsService });
  },
};
