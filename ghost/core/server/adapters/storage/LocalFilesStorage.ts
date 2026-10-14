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

const assetUrlSchema = z.string().min(1);

const trustedAssets = {
  '.js': { setting: 'pintura_js_url', configKey: 'url', contentType: 'text/javascript' },
  '.css': { setting: 'pintura_css_url', configKey: 'styles', contentType: 'text/css' },
} satisfies Record<string, { setting: string; configKey: string; contentType: string }>;

// Frontend apps whose script and stylesheet URLs can be pointed at a
// self-hosted copy through config, e.g. `portal:url` or `sodoSearch:styles`.
const frontendApps = [
  'portal',
  'sodoSearch',
  'comments',
  'announcementBar',
  'signupForm',
  'adminToolbar',
];

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
   * Scripts and stylesheets the site itself points at are the exception:
   * the Pintura files an admin uploaded in Settings, and self-hosted
   * frontend apps (Portal, Search, Comments, ...) configured in config.
   * Browsers refuse to load those with an inert type.
   */
  setServeHeaders(res: Response, filePath: string): void {
    super.setServeHeaders(res, filePath);

    res.setHeader(
      'Content-Type',
      this.getTrustedAssetContentType(filePath) ?? getStorageContentType(filePath),
    );
  }

  private getTrustedAssetContentType(filePath: string): string | null {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== '.js' && extension !== '.css') {
      return null;
    }

    const asset = trustedAssets[extension];
    const assetUrls = [
      settingsCache.get(asset.setting),
      ...frontendApps.map((app) => {
        const url = config.get(`${app}:${asset.configKey}`);
        return typeof url === 'string'
          ? url.replace('{version}', config.get(`${app}:version`))
          : url;
      }),
    ];

    const resolvedPath = path.resolve(filePath);
    return assetUrls.some((url) => this.getStoragePath(url) === resolvedPath)
      ? asset.contentType
      : null;
  }

  private getStoragePath(url: unknown): string | null {
    const parsed = assetUrlSchema.safeParse(url);
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
      return this._resolveAndValidateStoragePath(relativePath);
    } catch {
      // Invalid, external, or out-of-storage URLs retain the inert type.
      return null;
    }
  }
}

export default LocalFilesStorage;
