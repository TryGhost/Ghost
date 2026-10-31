import { defineService } from '../../../kernel/define-service';
import type ExternalMediaInliner from './external-media-inliner';

// Runs in the required services phase, after the models and storage adapters
// exist. The upload policy and the active storage adapter are read on every
// selection because the e2e lane boots Ghost repeatedly in one process with
// changed configuration. The adapter manager caches each adapter, so a repeat
// lookup returns the same instance until the configuration changes.
export default defineService('Media inliner', (): ExternalMediaInliner => {
  const MediaInliner = require('./external-media-inliner');
  const models = require('../../models');
  const adapterManager = require('../adapter-manager').default;
  const config = require('../../../shared/config');
  const {
    isAllowedImageContent,
    isAllowedImageExtension,
    isSvgExtension,
  } = require('../../lib/image/image-content');

  // Resolved here so a missing or broken adapter fails init rather than the
  // first import.
  adapterManager.getAdapter('storage:media');
  adapterManager.getAdapter('storage:images');
  adapterManager.getAdapter('storage:files');

  return new MediaInliner({
    PostModel: models.Post,
    TagModel: models.Tag,
    UserModel: models.User,
    PostMetaModel: models.PostsMeta,
    logging: require('@tryghost/logging'),
    request: require('../../lib/request-external'),
    urlUtils: require('../../../shared/url-utils').default,
    // file-type is ESM-only. tsc emits this as `require('file-type')` under
    // module: commonjs, which resolves via Node's require(esm). The inliner
    // calls it on the first download, not at boot.
    loadFileType: () => import('file-type'),
    // Pulls in libheif-js, a WASM codec costing ~50ms to load, so the inliner
    // only calls it when a HEIC file needs converting.
    loadHeicConvert: () => require('heic-convert'),
    getMediaStorage: async (extension: string, fileBuffer: Buffer) => {
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
          return adapterManager.getAdapter('storage:images');
        }

        return null;
      } else if (config.get('uploads').media.extensions.includes(extension)) {
        return adapterManager.getAdapter('storage:media');
      } else if (config.get('uploads').files.extensions.includes(extension)) {
        return adapterManager.getAdapter('storage:files');
      } else {
        return null;
      }
    },
  });
});
