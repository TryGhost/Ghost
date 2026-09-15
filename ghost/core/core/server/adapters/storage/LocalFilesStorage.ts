// # Local File System Storage module
// The (default) module for storing media, using the local file system
import type { Response } from 'express';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import { getStorageContentType } from '../../services/files/file-type-utils';
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
   */
  setServeHeaders(res: Response, filePath: string): void {
    super.setServeHeaders(res, filePath);
    res.setHeader('Content-Type', getStorageContentType(filePath));
  }
}

export default LocalFilesStorage;
