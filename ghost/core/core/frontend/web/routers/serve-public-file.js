const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils').default;
const tpl = require('@tryghost/tpl');
const { cardAssets } = require('../../services/assets-minification');
const themeEngine = require('../../services/theme-engine');
const settingsCache = require('../../../shared/settings-cache');

const messages = {
  imageNotFound: 'Image not found',
  fileNotFound: 'File not found',
};

const blogRegex = /(\{\{blog-url\}\})/g;

/**
 * Replace the {{blog-url}} placeholder with the site URL (without a trailing slash)
 *
 * @param {string} str
 * @returns {string}
 */
function replaceBlogUrl(str) {
  return str.replace(blogRegex, urlUtils.urlFor('home', true).replace(/\/$/, ''));
}

/**
 * Build the response headers Ghost uses for small, cacheable text responses
 *
 * @param {string} body
 * @param {string} mime
 * @param {number} maxAge in seconds
 * @returns {Object}
 */
function buildTextHeaders(body, mime, maxAge) {
  return {
    'Content-Type': mime,
    'Content-Length': Buffer.byteLength(body),
    ETag: `"${crypto.createHash('md5').update(body, 'utf8').digest('hex')}"`,
    'Cache-Control': `public, max-age=${maxAge}`,
  };
}

/**
 * If this request has a ?v= param, make sure the cache has the same key
 *
 * @param {Object} req
 * @param {Object} cache
 * @returns {boolean}
 */
function matchCacheKey(req, cache) {
  if (req.query && req.query.v && cache && cache.key) {
    return req.query.v === cache.key;
  }

  return true;
}

function createPublicFileMiddleware(location, file, mime, maxAge, options = {}) {
  let cache;
  // These files are provided by Ghost, and therefore live inside of the core folder
  const staticFilePath = config.get('paths').publicFilePath;
  // These files are built on the fly, and must be saved in the content folder
  const builtFilePath = config.getContentPath('public');

  const locationPath = location === 'static' ? staticFilePath : builtFilePath;

  const filePath = file.match(/^public/)
    ? path.join(locationPath, file.replace(/^public/, ''))
    : path.join(locationPath, file);

  return function servePublicFileMiddleware(req, res, next) {
    if (cache && matchCacheKey(req, cache)) {
      res.writeHead(200, cache.headers);
      return res.end(cache.body);
    }

    // send image files directly and let express handle content-length, etag, etc
    if (mime.match(/^image/) || options.disableServerCache) {
      return res.sendFile(filePath, (err) => {
        if (err && err.status === 404) {
          // ensure we're triggering basic asset 404 and not a templated 404
          return next(
            new errors.NotFoundError({
              message: tpl(messages.imageNotFound),
              code: 'STATIC_FILE_NOT_FOUND',
              property: err.path,
            }),
          );
        }

        if (err) {
          return next(err);
        }
      });
    }

    // modify text files before caching+serving to ensure URL placeholders are transformed
    fs.readFile(filePath, (err, buf) => {
      if (err) {
        // Downgrade to a simple 404 if the file didn't exist
        if (err.code === 'ENOENT') {
          err = new errors.NotFoundError({
            message: tpl(messages.fileNotFound),
            code: 'PUBLIC_FILE_NOT_FOUND',
            property: err.path,
          });
        }
        return next(err);
      }

      let str = buf.toString();

      if (mime === 'text/xsl' || mime === 'text/plain' || mime === 'application/javascript') {
        str = replaceBlogUrl(str);
      }

      cache = {
        headers: buildTextHeaders(str, mime, maxAge),
        body: str,
        key: req.query && req.query.v ? req.query.v : null,
      };

      res.writeHead(200, cache.headers);
      res.end(cache.body);
    });
  };
}

/**
 * Card assets are assembled in memory from a build-time manifest, so there's no
 * file on disk to read — see services/assets-minification/card-assets.js
 *
 * @param {'css'|'js'} type
 * @param {string} mime
 * @param {number} maxAge
 */
function createCardAssetMiddleware(type, mime, maxAge) {
  return function serveCardAssetMiddleware(req, res, next) {
    const bundle = cardAssets.getBundle(type);

    if (!bundle) {
      return next(
        new errors.NotFoundError({
          message: tpl(messages.fileNotFound),
          code: 'PUBLIC_FILE_NOT_FOUND',
          property: `cards.min.${type}`,
        }),
      );
    }

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': Buffer.byteLength(bundle.content),
      ETag: `"${bundle.hash}"`,
      'Cache-Control': `public, max-age=${maxAge}`,
    });
    res.end(bundle.content);
  };
}

// Handles requests to robots.txt and favicon.ico (and caches them)
function servePublicFile(location, file, type, maxAge, options = {}) {
  const publicFileMiddleware = createPublicFileMiddleware(location, file, type, maxAge, options);

  return function servePublicFileMiddleware(req, res, next) {
    if (req.path === '/' + file) {
      return publicFileMiddleware(req, res, next);
    } else {
      return next();
    }
  };
}

// Handles requests to public static files served by Ghost
function servePublicFiles(siteApp) {
  // Serve sitemap.xsl
  siteApp.get(
    '/sitemap.xsl',
    createPublicFileMiddleware(
      'static',
      'sitemap.xsl',
      'text/xsl',
      config.get('caching:sitemapXSL:maxAge'),
    ),
  );

  // Serve stylesheets for default templates
  siteApp.get(
    '/public/ghost.css',
    createPublicFileMiddleware(
      'static',
      'public/ghost.css',
      'text/css',
      config.get('caching:publicAssets:maxAge'),
    ),
  );
  siteApp.get(
    '/public/ghost.min.css',
    createPublicFileMiddleware(
      'static',
      'public/ghost.min.css',
      'text/css',
      config.get('caching:publicAssets:maxAge'),
    ),
  );

  // Traffic analytics tracking script
  siteApp.get(
    '/public/ghost-stats.min.js',
    createPublicFileMiddleware(
      'static',
      'public/ghost-stats.min.js',
      'application/javascript',
      config.get('caching:publicAssets:maxAge'),
    ),
  );

  // Card assets (assembled in memory per active theme)
  siteApp.get(
    '/public/cards.min.css',
    createCardAssetMiddleware('css', 'text/css', config.get('caching:publicAssets:maxAge')),
  );
  siteApp.get(
    '/public/cards.min.js',
    createCardAssetMiddleware(
      'js',
      'application/javascript',
      config.get('caching:publicAssets:maxAge'),
    ),
  );

  // Comment counts
  siteApp.get(
    '/public/comment-counts.min.js',
    createPublicFileMiddleware(
      'static',
      'public/comment-counts.min.js',
      'application/javascript',
      config.get('caching:publicAssets:maxAge'),
    ),
  );

  // Member attribution
  siteApp.get(
    '/public/member-attribution.min.js',
    createPublicFileMiddleware(
      'static',
      'public/member-attribution.min.js',
      'application/javascript',
      config.get('caching:publicAssets:maxAge'),
    ),
  );

  // Private page runtime
  siteApp.get(
    '/public/private.js',
    createPublicFileMiddleware(
      'static',
      'public/private.js',
      'application/javascript',
      config.get('caching:publicAssets:maxAge'),
    ),
  );
  siteApp.get(
    '/public/private.min.js',
    createPublicFileMiddleware(
      'static',
      'public/private.min.js',
      'application/javascript',
      config.get('caching:publicAssets:maxAge'),
    ),
  );

  // Recommendations well-known
  siteApp.get(
    '/.well-known/recommendations.json',
    createPublicFileMiddleware(
      'built',
      '.well-known/recommendations.json',
      'application/json',
      config.get('caching:publicAssets:maxAge'),
      { disableServerCache: true },
    ),
  );

  // Serve robots.txt. Precedence: private site > robots_txt setting > theme file > Ghost default
  const robotsTxtMaxAge = config.get('caching:robotstxt:maxAge');
  const defaultRobotsTxtMiddleware = createPublicFileMiddleware(
    'static',
    'robots.txt',
    'text/plain',
    robotsTxtMaxAge,
  );
  siteApp.get('/robots.txt', function serveRobotsTxt(req, res, next) {
    // If private blogging is enabled, let filterPrivateRoutes handle it
    if (settingsCache.get('is_private')) {
      return next();
    }

    // A site-level robots.txt lives in settings so it survives theme updates
    const customRobotsTxt = settingsCache.get('robots_txt');
    if (typeof customRobotsTxt === 'string' && customRobotsTxt.trim() !== '') {
      const body = replaceBlogUrl(customRobotsTxt);
      res.writeHead(200, buildTextHeaders(body, 'text/plain', robotsTxtMaxAge));
      return res.end(body);
    }

    const activeTheme = themeEngine.getActive();
    if (activeTheme?.hasRobotsTxt()) {
      return next();
    }
    return defaultRobotsTxtMiddleware(req, res, next);
  });
}

module.exports = servePublicFiles;
module.exports.servePublicFile = servePublicFile;
module.exports.createPublicFileMiddleware = createPublicFileMiddleware;
