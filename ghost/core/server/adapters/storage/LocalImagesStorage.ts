// # Local File System Image Storage module
// The (default) module for storing images, using the local file system
import fs from 'node:fs/promises';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import { detectStorageContentType, getInertContentType } from '../../lib/file-types';
import LocalStorageBase from './LocalStorageBase';

const messages = {
  notFound: 'Image not found',
  notFoundWithRef: 'Image not found: {file}',
  cannotRead: 'Could not read image: {file}',
};

// Images are read far more often than written, so a type is kept until the
// file changes. Bounded so a large image library can't grow it without limit.
const CONTENT_TYPE_CACHE_LIMIT = 1000;

class LocalImagesStorage extends LocalStorageBase {
  readonly #contentTypes = new Map<string, string | undefined>();
  readonly #pendingContentTypes = new Map<string, Promise<string | undefined>>();

  constructor() {
    super({
      storagePath: config.getContentPath('images'),
      staticFileURLPrefix: urlUtils.STATIC_IMAGE_URL_PREFIX,
      siteUrl: config.getSiteUrl(),
      errorMessages: messages,
    });
  }

  /**
   * Sets the content type from the file's contents before serving it.
   *
   * S3 stores a type at write time; local storage has nowhere to keep one, so
   * `express.static` would type the file from its caller-chosen extension.
   * `send` only derives a type when none is set, so setting it here wins.
   */
  serve(): RequestHandler {
    const serveStaticContent = super.serve();

    return (req: Request, res: Response, next: NextFunction) => {
      this._getServeContentType(req.path)
        // Serving must not depend on resolving a type
        .catch(() => undefined)
        .then((contentType) => {
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }

          serveStaticContent(req, res, next);
        })
        .catch(next);
    };
  }

  /**
   * @param requestPath the request path, relative to the image route
   * @returns the content type to serve the file with, or `undefined` when
   * there is no file to read
   */
  async _getServeContentType(requestPath: string): Promise<string | undefined> {
    let filePath: string;

    try {
      // Rejects anything that resolves outside the image directory
      filePath = this._resolveAndValidateStoragePath(
        undefined,
        decodeURIComponent(requestPath),
        false,
      );
    } catch {
      return undefined;
    }

    const stats = await fs.stat(filePath).catch(() => null);
    if (!stats?.isFile()) {
      return undefined;
    }

    // Keyed on the stat so a file replaced under the same name misses
    const cacheKey = `${filePath}:${stats.mtimeMs}:${stats.size}`;
    // An inconclusive lookup is cached too, so SVGs aren't reread on every request.
    if (this.#contentTypes.has(cacheKey)) {
      return this.#contentTypes.get(cacheKey);
    }

    const pending = this.#pendingContentTypes.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Undetectable contents are left to express.static, which types them from
    // the extension — .svg and .svgz included, and every SVG here has been
    // sanitized. The exception is a name a browser would execute: image
    // uploads reject those extensions, but the file store guards them anyway.
    const lookup = detectStorageContentType(filePath)
      .then((detectedType) => {
        const contentType = detectedType ?? getInertContentType(filePath);

        if (this.#contentTypes.size >= CONTENT_TYPE_CACHE_LIMIT) {
          // Map keeps insertion order: drop the oldest rather than empty the cache
          const oldest = this.#contentTypes.keys().next();
          if (!oldest.done) {
            this.#contentTypes.delete(oldest.value);
          }
        }

        this.#contentTypes.set(cacheKey, contentType);
        return contentType;
      })
      .finally(() => {
        this.#pendingContentTypes.delete(cacheKey);
      });

    // Share only detection; each request still stats the file to check freshness.
    this.#pendingContentTypes.set(cacheKey, lookup);
    return lookup;
  }
}

export default LocalImagesStorage;
