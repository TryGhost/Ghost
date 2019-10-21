const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../../config');
const urlUtils = require('../../../lib/url-utils');

function createPublicFileMiddleware(file, type, maxAge) {
    let content;
    const publicFilePath = config.get('paths').publicFilePath;
    const filePath = file.match(/^public/) ? path.join(publicFilePath, file.replace(/^public/, '')) : path.join(publicFilePath, file);
    const blogRegex = /(\{\{blog-url\}\})/g;
    const adminRegex = /(\{\{admin-url\}\})/g;

    return function servePublicFile(req, res, next) {
        if (content) {
            res.writeHead(200, content.headers);
            return res.end(content.body);
        }
        fs.readFile(filePath, (err, buf) => {
            if (err) {
                return next(err);
            }

            let str = buf.toString();

            if (type === 'text/xsl' || type === 'text/plain' || type === 'application/javascript') {
                str = str.replace(blogRegex, urlUtils.urlFor('home', true).replace(/\/$/, ''));
                str = str.replace(adminRegex, urlUtils.urlFor('admin', true).replace(/\/$/, ''));
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

    return function servePublicFile(req, res, next) {
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
