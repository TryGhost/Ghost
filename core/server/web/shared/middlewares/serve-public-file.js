const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../../config');
const urlService = require('../../../services/url');

// ### servePublicFile Middleware
// Handles requests to robots.txt and favicon.ico (and caches them)
function servePublicFile(file, type, maxAge) {
    let content;
    const publicFilePath = config.get('paths').publicFilePath;
    const filePath = file.match(/^public/) ? path.join(publicFilePath, file.replace(/^public/, '')) : path.join(publicFilePath, file);
    const blogRegex = /(\{\{blog-url\}\})/g;
    const apiRegex = /(\{\{api-url\}\})/g;

    return function servePublicFile(req, res, next) {
        if (req.path === '/' + file) {
            if (content) {
                res.writeHead(200, content.headers);
                res.end(content.body);
            } else {
                fs.readFile(filePath, (err, buf) => {
                    if (err) {
                        return next(err);
                    }

                    if (type === 'text/xsl' || type === 'text/plain' || type === 'application/javascript') {
                        buf = buf.toString().replace(blogRegex, urlService.utils.urlFor('home', true).replace(/\/$/, ''));
                        buf = buf.toString().replace(apiRegex, urlService.utils.urlFor('api', {cors: true, version: 'v0.1', versionType: 'content'}, true));
                    }
                    content = {
                        headers: {
                            'Content-Type': type,
                            'Content-Length': buf.length,
                            ETag: `"${crypto.createHash('md5').update(buf, 'utf8').digest('hex')}"`,
                            'Cache-Control': `public, max-age=${maxAge}`
                        },
                        body: buf
                    };
                    res.writeHead(200, content.headers);
                    res.end(content.body);
                });
            }
        } else {
            return next();
        }
    };
}

module.exports = servePublicFile;
