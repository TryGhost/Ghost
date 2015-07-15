var crypto = require('crypto'),
    fs     = require('fs'),
    path   = require('path'),
    config = require('../config');

// ### ServeSharedFile Middleware
// Handles requests to robots.txt and favicon.ico (and caches them)
function serveSharedFile(file, type, maxAge) {
    var content,
        filePath = path.join(config.paths.corePath, 'shared', file),
        re = /(\{\{blog-url\}\})/g;

    return function serveSharedFile(req, res, next) {
        if (req.url === '/' + file) {
            if (content) {
                res.writeHead(200, content.headers);
                res.end(content.body);
            } else {
                fs.readFile(filePath, function readFile(err, buf) {
                    if (err) {
                        return next(err);
                    }
                    if (type === 'text/xsl' || type === 'text/plain') {
                        buf = buf.toString().replace(re, config.url.replace(/\/$/, ''));
                    }
                    content = {
                        headers: {
                            'Content-Type': type,
                            'Content-Length': buf.length,
                            ETag: '"' + crypto.createHash('md5').update(buf, 'utf8').digest('hex') + '"',
                            'Cache-Control': 'public, max-age=' + maxAge
                        },
                        body: buf
                    };
                    res.writeHead(200, content.headers);
                    res.end(content.body);
                });
            }
        } else {
            next();
        }
    };
}

module.exports = serveSharedFile;
