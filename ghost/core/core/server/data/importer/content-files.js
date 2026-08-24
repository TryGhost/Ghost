const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils').default;
const adapterManager = require('../../services/adapter-manager').default;
const ImageHandler = require('./handlers/image');
const ImporterContentFileHandler = require('./handlers/importer-content-file-handler');
const ContentFileImporter = require('./importers/content-file-importer');

function createContentFileHandlers() {
  const mediaStorage = adapterManager.getAdapter('storage:media');
  const fileStorage = adapterManager.getAdapter('storage:files');

  return [
    ImageHandler,
    new ImporterContentFileHandler({
      type: 'media',
      // These broad directory names preserve the existing /db/ archive behavior.
      directories: ['media', 'content'],
      ignoreRootFolderFiles: true,
      extensions: config.get('uploads').media.extensions,
      contentTypes: config.get('uploads').media.contentTypes,
      urlUtils,
      storage: mediaStorage,
    }),
    new ImporterContentFileHandler({
      type: 'files',
      directories: ['files', 'content'],
      ignoreRootFolderFiles: true,
      extensions: config.get('uploads').files.extensions,
      contentTypes: config.get('uploads').files.contentTypes,
      urlUtils,
      storage: fileStorage,
    }),
  ];
}

function createContentFileImporters() {
  return [
    new ContentFileImporter({
      type: 'images',
      store: adapterManager.getAdapter('storage:images'),
    }),
    new ContentFileImporter({
      type: 'media',
      store: adapterManager.getAdapter('storage:media'),
    }),
    new ContentFileImporter({
      type: 'files',
      store: adapterManager.getAdapter('storage:files'),
    }),
  ];
}

module.exports = {
  createContentFileHandlers,
  createContentFileImporters,
};
