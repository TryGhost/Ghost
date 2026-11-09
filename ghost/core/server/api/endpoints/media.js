const path = require('path');

const adapterManager = require('../../services/adapter-manager').default;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'media',
  upload: {
    statusCode: 201,
    headers: {
      cacheInvalidate: false,
    },
    permissions: false,
    async query(frame) {
      const storage = adapterManager.getAdapter('storage:media');

      let thumbnailPath = null;
      if (frame.files.thumbnail && frame.files.thumbnail[0]) {
        thumbnailPath = await storage.save(frame.files.thumbnail[0]);
      }

      const filePath = await storage.save(frame.files.file[0]);

      return {
        filePath,
        thumbnailPath,
      };
    },
  },

  uploadThumbnail: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: false,
    data: ['url', 'ref'],
    async query(frame) {
      const mediaStorage = adapterManager.getAdapter('storage:media');
      const targetDir = path.dirname(mediaStorage.urlToPath(frame.data.url));

      // Both the target directory and the filename come from the request, so deleting
      // a file that matches by name would replace media this upload is not related to.
      // `save()` generates a unique filename when one already exists, so an upload
      // always creates a new file.
      return await mediaStorage.save(frame.file, targetDir);
    },
  },
};

module.exports = controller;
