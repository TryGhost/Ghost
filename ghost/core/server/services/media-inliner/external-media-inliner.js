const mime = require('mime-types');
const errors = require('@tryghost/errors');
const string = require('@tryghost/string');
const path = require('path');
const { isSvgExtension } = require('../../lib/image/image-content');
const { sanitizeSvgBuffer } = require('../../lib/image/svg-sanitizer');
const vm = require('node:vm');
const { createOriginSchemes } = require('./origin-schemes');
const ExternalMediaInlinerJob = require('./external-media-inliner-job').default;

const DEFAULT_DOMAINS = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];

// Plaintext media URLs are first tried over https. That attempt connects with a
// short timeout and doesn't retry connection failures, so an origin without
// https costs one short wait before the http fallback instead of the full
// timeout and retries for every file.
const HTTPS_UPGRADE_REQUEST_OPTIONS = {
  timeout: {
    connect: 3000,
    secureConnect: 3000,
  },
  retry: {
    // got's defaults minus the codes that mean https isn't being served
    errorCodes: ['ECONNRESET', 'EADDRINUSE', 'EPIPE', 'EAI_AGAIN'],
  },
};

// Failures that mean nothing answers https on the origin, which an import run
// remembers so later files skip straight to http. TLS and certificate failures
// still fall back for that one file but aren't remembered, as they are the
// cheapest failure for someone on the network path to cause.
const HTTPS_UNREACHABLE_CODES = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH']);

/**
 * @param {unknown} error
 * @param {string} origin - host and port of the https URL that was requested
 * @returns {boolean}
 */
function isHttpsUnreachable(error, origin) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const { code, event, options } =
    /** @type {{code?: string, event?: string, options?: {url?: unknown}}} */ (error);
  // got points options.url at the hop that failed; a failed redirect target
  // says nothing about whether the origin serves https
  if (options?.url && !isHttpsURLOnOrigin(String(options.url), origin)) {
    return false;
  }
  if (code === 'ETIMEDOUT') {
    // got reports every timeout as ETIMEDOUT; only a TCP connect timeout
    // means the port isn't served
    return event === 'connect';
  }
  return HTTPS_UNREACHABLE_CODES.has(code ?? '');
}

/**
 * @param {string} url
 * @param {string} origin
 * @returns {boolean}
 */
function isHttpsURLOnOrigin(url, origin) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.host === origin;
  } catch {
    return false;
  }
}

/**
 * Encode raw characters but keep existing %XX escapes intact
 *
 * @param {string} url
 * @returns {string}
 */
function encodeRequestURL(url) {
  return encodeURI(url).replace(/%25([0-9a-f]{2})/gi, '%$1');
}

// Domains are regular expression patterns (migration tooling sends wildcards
// such as `https?://i[0-9]{1}.wp.com`), so they cannot be escaped. Matching
// runs under a V8 execution timeout instead to bound catastrophic backtracking.
const FIND_MATCHES_TIMEOUT_MS = 1000;
const PATTERN_TIMEOUT_CODE = 'MEDIA_INLINER_PATTERN_TIMEOUT';

let findMatchesScript;
let findMatchesContext;

function matchAllWithTimeout(content, regex, timeout) {
  if (!findMatchesScript) {
    findMatchesScript = new vm.Script('Array.from(content.matchAll(regex), (match) => match[1])');
    findMatchesContext = vm.createContext({});
  }

  findMatchesContext.content = content;
  findMatchesContext.regex = regex;

  try {
    // Copy into this realm so callers get a normal Array
    return Array.from(findMatchesScript.runInContext(findMatchesContext, { timeout }));
  } finally {
    findMatchesContext.content = undefined;
    findMatchesContext.regex = undefined;
  }
}

class ExternalMediaInliner {
  /** @type {object} */
  #PostModel;

  /** @type {object} */
  #PostMetaModel;

  /** @type {object} */
  #TagModel;

  /** @type {object} */
  #UserModel;

  /** @type {import('./types').ExternalMediaInlinerDependencies['logging']} */
  #logging;

  /** @type {import('./types').ExternalMediaInlinerDependencies['request']} */
  #request;

  /** @type {import('./types').ExternalMediaInlinerDependencies['urlUtils']} */
  #urlUtils;

  /** @type {import('./types').ExternalMediaInlinerDependencies['loadFileType']} */
  #loadFileType;

  /** @type {import('./types').ExternalMediaInlinerDependencies['loadHeicConvert']} */
  #loadHeicConvert;

  /** @type {import('./types').ExternalMediaInlinerDependencies['dispatchJob']} */
  #dispatchJob;

  /** @type {((buffer: Buffer) => Promise<{ext: string} | undefined>) | undefined} */
  #fileTypeFromBuffer;

  /**
   *
   * @param {import('./types').ExternalMediaInlinerDependencies} deps
   */
  constructor(deps) {
    this.#PostModel = deps.PostModel;
    this.#PostMetaModel = deps.PostMetaModel;
    this.#TagModel = deps.TagModel;
    this.#UserModel = deps.UserModel;
    this.#logging = deps.logging;
    this.#request = deps.request;
    this.#urlUtils = deps.urlUtils;
    this.#loadFileType = deps.loadFileType;
    this.#loadHeicConvert = deps.loadHeicConvert;
    this.#dispatchJob = deps.dispatchJob;
    this.getMediaStorage = deps.getMediaStorage;
  }

  /**
   * Loads file-type on the first download rather than at boot. A failed load
   * is not retained, so the next download tries again.
   *
   * @param {Buffer} buffer
   */
  async #getFileTypeFromBuffer(buffer) {
    if (!this.#fileTypeFromBuffer) {
      ({ fileTypeFromBuffer: this.#fileTypeFromBuffer } = await this.#loadFileType());
    }

    return this.#fileTypeFromBuffer(buffer);
  }

  /**
   * Splits a media URL into the URLs to try. Protocol-relative and plaintext
   * http URLs get an https upgrade with the http URL as its fallback. An
   * explicit :80 is dropped from the upgrade, as https isn't served there.
   * Other URLs are tried as given, with no fallback.
   *
   * @param {string} requestURL - url of remote media
   * @returns {{url: string, fallbackURL: string | null, origin: string | null}}
   *   `origin` is the host and port of `url` when it is an https URL, or null
   *   for any other scheme or a URL that can't be parsed
   */
  static getRequestCandidates(requestURL) {
    let rest;
    if (requestURL.startsWith('//')) {
      rest = requestURL.slice(2);
    } else if (/^http:\/\//i.test(requestURL)) {
      rest = requestURL.slice('http://'.length);
    } else {
      return {
        url: requestURL,
        fallbackURL: null,
        origin: ExternalMediaInliner.#httpsOrigin(requestURL),
      };
    }

    const url = `https://${rest.replace(/^([^/?#]*):80(?=[/?#]|$)/, '$1')}`;
    return { url, fallbackURL: `http://${rest}`, origin: ExternalMediaInliner.#httpsOrigin(url) };
  }

  /**
   * @param {string} url
   * @returns {string | null} host and port of an https URL, otherwise null
   */
  static #httpsOrigin(url) {
    if (!/^https:\/\//i.test(url)) {
      return null;
    }
    try {
      return new URL(url).host;
    } catch {
      // Unparseable URLs are still attempted, just not remembered
      return null;
    }
  }

  /**
   *
   * @param {string} requestURL - url of remote media
   * @param {Object} [options]
   * @param {import('./origin-schemes').OriginSchemes} [options.originSchemes] - schemes learned earlier in this import run
   * @returns {Promise<Object>}
   */
  async getRemoteMedia(requestURL, { originSchemes } = {}) {
    // @NOTE: this is the most expensive operation in the whole inlining process
    //        we should consider caching the results to improve performance

    const { url, fallbackURL, origin } = ExternalMediaInliner.getRequestCandidates(requestURL);
    const known = origin ? originSchemes?.get(origin) : undefined;

    // `secure` marks a request to the https origin, whose answer is recorded
    // so later files from the origin are never downgraded on a connection
    // failure, the failure someone on the network path can cause
    const secure = origin !== null;

    // `fallback` says which failures move on to the next attempt: 'any' while
    // it is unknown whether the origin serves https, 'response' once it has
    // answered. An https error response is the server's own answer, so the
    // file is still tried at the http URL the author wrote (e.g. an https
    // vhost serving a different site).
    /** @type {{url: string, secure?: boolean, upgrade?: boolean, fallback?: 'any' | 'response'}[]} */
    let attempts;
    if (!fallbackURL) {
      attempts = [{ url, secure }];
    } else if (known === 'https') {
      attempts = [{ url, secure, fallback: 'response' }, { url: fallbackURL }];
    } else if (known === 'http') {
      attempts = [{ url: fallbackURL }];
    } else {
      attempts = [{ url, secure, upgrade: true, fallback: 'any' }, { url: fallbackURL }];
    }

    const remember = (/** @type {'https' | 'http'} */ scheme) => {
      if (origin) {
        originSchemes?.set(origin, scheme);
      }
    };

    let lastError;
    for (const attempt of attempts) {
      try {
        const response = await this.#request(encodeRequestURL(attempt.url), {
          followRedirect: true,
          responseType: 'buffer',
          ...(attempt.upgrade ? HTTPS_UPGRADE_REQUEST_OPTIONS : {}),
        });

        if (attempt.secure) {
          remember('https');
        }
        return response;
      } catch (error) {
        lastError = error;

        // An HTTP response (e.g. a 404) means https answered
        const answered = Boolean(error && error.response);
        if (attempt.secure && answered) {
          remember('https');
        }
        if (!attempt.fallback || (attempt.fallback === 'response' && !answered)) {
          break;
        }
        if (!answered && origin && isHttpsUnreachable(error, origin)) {
          remember('http');
        }
      }
    }

    // NOTE: add special case for 404s
    this.#logging.error(`Error downloading remote media: ${requestURL}`);
    this.#logging.error(
      new errors.DataImportError({
        err: lastError,
      }),
    );

    return null;
  }

  /**
   *
   * @param {string} requestURL - url of remote media
   * @param {Object} response - response from request
   * @returns {Promise<Object>}
   */
  async extractFileDataFromResponse(requestURL, response) {
    let extension;
    let body = response.body;

    // Attempt to get the file extension from the file itself
    // If that fails, or if `.ext` is undefined, get the extension from the file path in the catch
    try {
      const fileInfo = await this.#getFileTypeFromBuffer(body);
      extension = fileInfo.ext;
    } catch {
      const headers = response.headers;
      const contentType = headers['content-type'];
      const extensionFromPath = path
        .parse(requestURL)
        .ext.split(/[^a-z]/i)
        .filter(Boolean)[0];
      extension = mime.extension(contentType) || extensionFromPath;
    }

    // If the file is heic or heif, attempt to convert it to jpeg
    if (extension === 'heic' || extension === 'heif') {
      // Lazy: the root's loader pulls in libheif-js, a WASM codec costing ~50ms
      // to load at boot. Deliberately outside the try — a missing codec is not a
      // conversion error, and swallowing it would store an unconvertible .heic
      // in its place.
      const convert = this.#loadHeicConvert();

      try {
        body = await convert({
          buffer: body,
          format: 'JPEG',
        });

        extension = 'jpg';
      } catch (error) {
        this.#logging.error(`Error converting file to JPEG: ${requestURL}`);
        this.#logging.error(
          new errors.DataImportError({
            err: error,
          }),
        );
      }
    }

    const removeExtRegExp = new RegExp(`.${extension}`, '');
    const fileNameNoExt = path.parse(requestURL).base.replace(removeExtRegExp, '');

    // CASE: Query strings _can_ form part of the unique image URL, so rather that strip them include the in the file name
    // Then trim to last 248 chars (this will be more unique than the first 248), and trim leading & trailing dashes.
    // 248 is on the lower end of limits from various OSes and file systems
    const fileName = string
      .slugify(path.parse(fileNameNoExt).base, {
        requiredChangesOnly: true,
      })
      .slice(-248)
      .replace(/^-|-$/, '');

    return {
      fileBuffer: body,
      filename: `${fileName}.${extension}`,
      extension: `.${extension}`,
    };
  }

  /**
   *
   * @param {Object} media - media to store locally
   * @returns {Promise<string>} - path to stored media
   */
  async storeMediaLocally(media) {
    // The extension can come from the response's Content-Type or the URL
    // when the contents aren't a recognised binary format, so SVGs get the
    // same sanitizing as SVG uploads
    if (isSvgExtension(media.extension)) {
      const sanitized = await sanitizeSvgBuffer(media.fileBuffer, media.extension === '.svgz');

      if (!sanitized) {
        this.#logging.warn(`Could not sanitize SVG file: ${media.filename}`);
        return null;
      }

      media = { ...media, fileBuffer: sanitized };
    }

    // A failed content check skips this file rather than the rest of the post
    let storage;
    try {
      storage = await this.getMediaStorage(media.extension, media.fileBuffer);
    } catch (error) {
      this.#logging.warn(`Could not determine storage adapter for file: ${media.filename}`);
      this.#logging.error(error);
      return null;
    }

    if (!storage) {
      this.#logging.warn(`No storage adapter found for file extension: ${media.extension}`);
      return null;
    } else {
      // @NOTE: this is extremely convoluted and should live on a
      //        storage adapter level
      const targetDir = storage.getTargetDir(storage.storagePath);
      const uniqueFileName = await storage.getUniqueFileName(
        {
          name: media.filename,
        },
        targetDir,
      );
      const targetPath = path.relative(storage.storagePath, uniqueFileName);
      const filePath = await storage.saveRaw(media.fileBuffer, targetPath);

      return this.#urlUtils.toTransformReady(filePath);
    }
  }

  /**
   * Download and store one external media URL without deciding where it came from
   * or where its replacement belongs. Callers own discovery and replacement.
   *
   * @param {string} sourceUrl
   * @param {Object} [options]
   * @param {import('./origin-schemes').OriginSchemes} [options.originSchemes] - schemes learned earlier in this import run
   * @returns {Promise<import('./types').ExternalMediaImportResult>}
   */
  async importUrl(sourceUrl, { originSchemes } = {}) {
    let response;
    try {
      response = await this.getRemoteMedia(sourceUrl, { originSchemes });
    } catch (error) {
      return {
        status: 'failed',
        sourceUrl,
        stage: 'download',
        reason: 'The media file could not be downloaded.',
        error,
      };
    }

    if (!response) {
      return {
        status: 'failed',
        sourceUrl,
        stage: 'download',
        reason: 'The media file could not be downloaded.',
      };
    }

    let media;
    try {
      media = await this.extractFileDataFromResponse(sourceUrl, response);
    } catch (error) {
      return {
        status: 'failed',
        sourceUrl,
        stage: 'extract',
        reason: 'The downloaded media file could not be read.',
        error,
      };
    }

    try {
      const storedUrl = await this.storeMediaLocally(media);
      if (!storedUrl) {
        return {
          status: 'failed',
          sourceUrl,
          stage: 'unsupported',
          reason: 'No configured storage accepts this media file.',
        };
      }

      return {
        status: 'stored',
        sourceUrl,
        storedUrl,
      };
    } catch (error) {
      return {
        status: 'failed',
        sourceUrl,
        stage: 'storage',
        reason: 'The media file could not be stored in Ghost.',
        error,
      };
    }
  }

  /**
   * Convert an import result into the replacement URL expected by the existing
   * content and field processing. Expected download and unsupported-file failures
   * return null so the original URL remains unchanged. Results containing an
   * underlying processing error are rethrown so the established per-resource
   * catch boundary continues to log and isolate them.
   *
   * @param {import('./types').ExternalMediaImportResult} result
   * @returns {string|null}
   */
  #replacementUrlFromImportResult(result) {
    if (result.status === 'stored') {
      return result.storedUrl;
    }
    if ('error' in result) {
      throw result.error;
    }
    return null;
  }

  /**
   * @param {string} content
   * @param {string} domain - regular expression pattern matching the start of a media URL
   * @param {Object} [options]
   * @param {number} [options.timeout] - milliseconds before matching is abandoned
   * @returns {string[]}
   */
  static findMatches(content, domain, { timeout = FIND_MATCHES_TIMEOUT_MS } = {}) {
    // NOTE: the src could end with a quote, bracket, apostrophe, double-backslash, or encoded quote.
    //     Backlashes are added to content as an escape character
    const srcTerminationSymbols = `("|\\)|'|(?=(?:,https?))| |<|\\\\|&quot;|$)`;
    const regex = new RegExp(`(${domain}.*?)(${srcTerminationSymbols})`, 'igm');

    // Simplify the matches so we only get the result needed
    let matchesArray;
    try {
      matchesArray = matchAllWithTimeout(content, regex, timeout);
    } catch (error) {
      if (error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
        throw new errors.DataImportError({
          message: `Matching media URLs for domain pattern "${domain}" timed out.`,
          code: PATTERN_TIMEOUT_CODE,
          errorDetails: { domain },
        });
      }
      throw error;
    }

    // Trim trailing commas from each match
    matchesArray = matchesArray.map((item) => {
      return item.replace(/,$/, '');
    });

    return matchesArray;
  }

  /**
   * Find & inline external media from a JSON sting.
   * This works with both Lexical & Mobiledoc, so no separate methods are needed here.
   *
   * @param {string} content - stringified JSON of post Lexical or Mobiledoc content
   * @param {String[]} domains - domains to inline media from
   * @param {Set<string>} [timedOutDomains] - patterns to skip; timed out patterns are added
   * @param {import('./origin-schemes').OriginSchemes} [originSchemes] - schemes learned earlier in this import run
   * @returns {Promise<string>} - updated stringified JSON of post content
   */
  async inlineContent(
    content,
    domains,
    timedOutDomains = new Set(),
    originSchemes = createOriginSchemes(),
  ) {
    for (const domain of domains) {
      if (timedOutDomains.has(domain)) {
        continue;
      }

      let matches;
      try {
        matches = this.constructor.findMatches(content, domain);
      } catch (err) {
        if (err.code !== PATTERN_TIMEOUT_CODE) {
          throw err;
        }
        // Skip only this pattern so replacements from other domains are kept
        timedOutDomains.add(domain);
        this.#logging.error(err);
        continue;
      }

      for (const src of matches) {
        const result = await this.importUrl(src, { originSchemes });
        const replacementUrl = this.#replacementUrlFromImportResult(result);

        if (replacementUrl) {
          // NOTE: does not account for duplicate images in content
          //       in those cases would be processed twice
          content = content.replace(src, replacementUrl);
          this.#logging.info(`Inlined media: ${src} -> ${replacementUrl}`);
        }
      }
    }

    return content;
  }

  /**
   *
   * @param {Object} resourceModel - one of PostModel, TagModel, UserModel instances
   * @param {String[]} fields - fields to inline
   * @param {String[]} domains - domains to inline media from
   * @param {import('./origin-schemes').OriginSchemes} [originSchemes] - schemes learned earlier in this import run
   * @returns Promise<Object> - updated fields map with local media paths
   */
  async inlineFields(resourceModel, fields, domains, originSchemes = createOriginSchemes()) {
    const updatedFields = {};

    for (const field of fields) {
      for (const domain of domains) {
        const src = resourceModel.get(field);

        if (src && src.startsWith(domain)) {
          const result = await this.importUrl(src, { originSchemes });
          const replacementUrl = this.#replacementUrlFromImportResult(result);

          if (replacementUrl) {
            updatedFields[field] = replacementUrl;
            this.#logging.info(`Added media to inline: ${src} -> ${replacementUrl}`);
          }
        }
      }
    }

    return updatedFields;
  }

  /**
   *
   * @param {Object[]} resources - array of model instances
   * @param {Object} model - resource model
   * @param {string[]} fields - fields to inline
   * @param {string[]} domains - domains to inline media from
   * @param {import('./origin-schemes').OriginSchemes} [originSchemes] - schemes learned earlier in this import run
   */
  async inlineSimpleFields(
    resources,
    model,
    fields,
    domains,
    originSchemes = createOriginSchemes(),
  ) {
    this.#logging.info(
      `Starting inlining external media for ${resources?.length} resources and with ${fields.join(', ')} fields`,
    );

    for (const resource of resources) {
      try {
        const updatedFields = await this.inlineFields(resource, fields, domains, originSchemes);

        if (Object.keys(updatedFields).length > 0) {
          await model.edit(updatedFields, {
            id: resource.id,
            context: {
              internal: true,
            },
          });
        }
      } catch (err) {
        this.#logging.error(`Error inlining media for: ${resource.id}`);
        this.#logging.error(
          new errors.DataImportError({
            err,
          }),
        );
      }
    }
  }

  /**
   * @param {string[]} [domains] domains to inline media from
   */
  async startInlining(domains) {
    this.#logging.info('[Background Job] external-media-inliner queued');
    await this.#dispatchJob(
      new ExternalMediaInlinerJob({ domains: domains?.length ? domains : DEFAULT_DOMAINS }),
    );
  }

  /**
   *
   * @param {string[]} domains domains to inline media from
   */
  async inline(domains) {
    const posts = await this.#PostModel.findAll({ context: { internal: true } });
    const postsInilingFields = ['feature_image'];

    this.#logging.info(`Starting inlining external media for posts: ${posts?.length}`);

    // A pattern that timed out once is likely to time out again, so stop
    // applying it rather than spending the timeout on every remaining post.
    const timedOutDomains = new Set();
    // Which scheme each origin serves, shared by every file in this run
    const originSchemes = createOriginSchemes();

    for (const post of posts) {
      try {
        const mobiledocContent = post.get('mobiledoc');
        const lexicalContent = post.get('lexical');

        const updatedFields = await this.inlineFields(
          post,
          postsInilingFields,
          domains,
          originSchemes,
        );

        if (mobiledocContent) {
          const inlinedContent = await this.inlineContent(
            mobiledocContent,
            domains,
            timedOutDomains,
            originSchemes,
          );

          // If content has changed, update the post
          if (inlinedContent !== mobiledocContent) {
            updatedFields.mobiledoc = inlinedContent;
          }
        }

        if (lexicalContent) {
          const inlinedContent = await this.inlineContent(
            lexicalContent,
            domains,
            timedOutDomains,
            originSchemes,
          );

          // If content has changed, update the post
          if (inlinedContent !== lexicalContent) {
            updatedFields.lexical = inlinedContent;
          }
        }

        if (Object.keys(updatedFields).length > 0) {
          await this.#PostModel.edit(updatedFields, {
            id: post.id,
            context: {
              internal: true,
            },
          });
        }
      } catch (err) {
        this.#logging.error(`Error inlining media for post: ${post.id}`);
        this.#logging.error(
          new errors.DataImportError({
            err,
          }),
        );
      }
    }

    const { data: postsMetas } = await this.#PostMetaModel.findPage({
      limit: 'all',
    });
    const postsMetaInilingFields = ['og_image', 'twitter_image'];

    await this.inlineSimpleFields(
      postsMetas,
      this.#PostMetaModel,
      postsMetaInilingFields,
      domains,
      originSchemes,
    );

    const { data: tags } = await this.#TagModel.findPage({
      limit: 'all',
    });
    const tagInliningFields = ['feature_image', 'og_image', 'twitter_image'];

    await this.inlineSimpleFields(tags, this.#TagModel, tagInliningFields, domains, originSchemes);

    const { data: users } = await this.#UserModel.findPage({
      limit: 'all',
    });
    const userInliningFields = ['profile_image', 'cover_image'];

    await this.inlineSimpleFields(
      users,
      this.#UserModel,
      userInliningFields,
      domains,
      originSchemes,
    );

    this.#logging.info('Finished inlining external media for posts, tags, and users');
  }
}

module.exports = ExternalMediaInliner;
