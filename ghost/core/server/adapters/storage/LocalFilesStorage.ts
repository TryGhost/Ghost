// # Local File System Storage module
// The (default) module for storing media, using the local file system
import path from 'path';
import type { Response } from 'express';
import config from '../../../shared/config';
// @ts-expect-error This module lacks type definitions.
import settingsCache from '../../../shared/settings-cache';
import urlUtils from '../../../shared/url-utils';
import { getStorageContentType } from '../../lib/file-types';
import LocalStorageBase from './LocalStorageBase';

const messages = {
  notFound: 'File not found',
  notFoundWithRef: 'File not found: {file}',
  cannotRead: 'Could not read File: {file}',
};

class LocalFilesStorage extends LocalStorageBase {
  constructor() {
    super({
      storagePath: config.getContentPath('files'),
      siteUrl: config.getSiteUrl(),
      staticFileURLPrefix: urlUtils.STATIC_FILES_URL_PREFIX,
      errorMessages: messages,
    });
  }

  /**
   * The files upload endpoint resolves an inert content type for each file
   * (e.g. .html -> text/plain, .svg -> application/octet-stream), which S3
   * stores alongside the object. Local storage has nowhere to keep it, so
   * resolve it again here instead of letting express.static derive a
   * browser-executable type from the extension.
   *
   * The Pintura script and stylesheet an admin uploaded in Settings are the
   * exception: Admin loads them as a module and a stylesheet, which browsers
   * refuse to do with an inert type.
   */
  setServeHeaders(res: Response, filePath: string): void {
    super.setServeHeaders(res, filePath);

    if (this.isPinturaAsset(filePath)) {
      return;
    }

    res.setHeader('Content-Type', getStorageContentType(filePath));
  }

  private isPinturaAsset(filePath: string): boolean {
    const resolvedFilePath = path.resolve(filePath);

    return ['pintura_js_url', 'pintura_css_url'].some((key) => {
      const url = settingsCache.get(key);
      if (!url) {
        return false;
      }

      try {
        return path.resolve(this.storagePath, this.urlToPath(url)) === resolvedFilePath;
      } catch {
        // The setting points somewhere other than this storage, e.g. a CDN
        return false;
      }
    });
  }
}

export default LocalFilesStorage;
