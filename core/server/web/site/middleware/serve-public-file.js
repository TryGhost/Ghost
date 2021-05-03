const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const errors = require('@tryghost/errors');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');
const i18n = require('../../../../shared/i18n');

function createPublicFileMiddleware(file, type, maxAge) {
    let content;
    const publicFilePath = config.get('paths').publicFilePath;
    const filePath = file.match(/^public/) ? path.join(publicFilePath, file.replace(/^public/, '')) : path.join(publicFilePath, file);
    const blogRegex = /(\{\{blog-url\}\})/g;

    return function servePublicFileMiddleware(req, res, next) {
        if (content) {
            res.writeHead(200, content.headers);
            return res.end(content.body);
        }

        // send image files directly and let express handle content-length, etag, etc
        if (type.match(/^image/)) {
            return res.sendFile(filePath, (err) => {
                if (err && err.status === 404) {
                    // ensure we're triggering basic asset 404 and not a templated 404
                    return next(new errors.NotFoundError({
                        message: i18n.t('errors.errors.imageNotFound'),
                        code: 'STATIC_FILE_NOT_FOUND',
                        property: err.path
                    }));
                }

                if (err) {
                    return next(err);
                }
            });
        }

        // modify text files before caching+serving to ensure URL placeholders are transformed
        fs.readFile(filePath, (err, buf) => {
            if (err) {
                return next(err);
            }

            let str = buf.toString();

            if (type === 'text/xsl' || type === 'text/plain' || type === 'application/javascript') {
                str = str.replace(blogRegex, urlUtils.urlFor('home', true).replace(/\/$/, ''));
            }

            content = {
                headers: {
                    'Content-Type': type,
                    'Content-Length': Buffer.from(str).length,
                    ETag: `"${crypto.createHash('md5').update(str, 'utf8').digest('hex')}"`,
                    'Cache-Control': `public, max-age=${maxAge}`
                },
                body: str
            };
            res.writeHead(200, content.headers);
            res.end(content.body);
        });
    };
}

// ### servePublicFile Middleware
// Handles requests to robots.txt and favicon.ico (and caches them)
function servePublicFile(file, type, maxAge) {
    const publicFileMiddleware = createPublicFileMiddleware(file, type, maxAge);

    return function servePublicFileMiddleware(req, res, next) {
        if (req.path === '/' + file) {
            return publicFileMiddleware(req, res, next);
        } else {
            return next();
        }
    };
}

module.exports = servePublicFile;
module.exports.servePublicFile = servePublicFile;
module.exports.createPublicFileMiddleware = createPublicFileMiddleware;
