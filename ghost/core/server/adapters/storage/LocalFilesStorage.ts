// # Local File System Storage module
// The (default) module for storing media, using the local file system
import path from 'path';
import type { Response } from 'express';
import { z } from 'zod';
import config from '../../../shared/config';
import settingsCache from '../../../shared/settings-cache';
import urlUtils from '../../../shared/url-utils';
import { getStorageContentType } from '../../lib/file-types';
import LocalStorageBase from './LocalStorageBase';

const messages = {
  notFound: 'File not found',
  notFoundWithRef: 'File not found: {file}',
  cannotRead: 'Could not read File: {file}',
};

const pinturaUrlSchema = z.string().min(1);

const pinturaAssets = {
  '.js': { setting: 'pintura_js_url', contentType: 'text/javascript' },
  '.css': { setting: 'pintura_css_url', contentType: 'text/css' },
} satisfies Record<string, { setting: string; contentType: string }>;

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

    res.setHeader(
      'Content-Type',
      this.getPinturaContentType(filePath) ?? getStorageContentType(filePath),
    );
  }

  private getPinturaContentType(filePath: string): string | null {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== '.js' && extension !== '.css') {
      return null;
    }

    const asset = pinturaAssets[extension];
    const parsed = pinturaUrlSchema.safeParse(settingsCache.get(asset.setting));
    if (!parsed.success) {
      return null;
    }

    try {
      const storageUrl = new URL(this.staticFileUrl);
      const assetUrl = new URL(parsed.data, this.siteUrl);
      const prefix = `${storageUrl.pathname}/`;
      if (assetUrl.origin !== storageUrl.origin || !assetUrl.pathname.startsWith(prefix)) {
        return null;
      }

      // URL paths are encoded; serve-static passes a decoded filesystem path.
      // Strip query strings/fragments and validate containment before comparing.
      const relativePath = decodeURIComponent(assetUrl.pathname.slice(prefix.length));
      const assetPath = this._resolveAndValidateStoragePath(relativePath);
      return assetPath === path.resolve(filePath) ? asset.contentType : null;
    } catch {
      // Invalid, external, or out-of-storage settings retain the inert type.
      return null;
    }
  }
}

export default LocalFilesStorage;
