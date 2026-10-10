const { getStorageContentType } = require('../../lib/file-types');
const adapterManager = require('../../services/adapter-manager').default;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'files',
  upload: {
    statusCode: 201,
    headers: {
      cacheInvalidate: false,
    },
    permissions: false,
    async query(frame) {
      const filePath = await adapterManager.getAdapter('storage:files').save({
        name: frame.file.originalname,
        path: frame.file.path,
        type: getStorageContentType(frame.file.originalname),
      });

      return {
        filePath,
      };
    },
  },
};

module.exports = controller;
