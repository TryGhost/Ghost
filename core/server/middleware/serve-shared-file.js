var crypto = require('crypto'),
    fs     = require('fs'),
    path   = require('path'),
    config = require('../config');

// ### ServeSharedFile Middleware
// Handles requests to robots.txt and favicon.ico (and caches them)
function serveSharedFile(file, type, maxAge) {
    var content,
        corePath = config.paths.corePath,
        filePath,
        blogRegex = /(\{\{blog-url\}\})/g,
        apiRegex = /(\{\{api-url\}\})/g;

    filePath = file.match(/^shared/) ? path.join(corePath, file) : path.join(corePath, 'shared', file);

    return function serveSharedFile(req, res, next) {
        if (req.path === '/' + file) {
            if (content) {
                res.writeHead(200, content.headers);
                res.end(content.body);
            } else {
                fs.readFile(filePath, function readFile(err, buf) {
                    if (err) {
                        return next(err);
                    }

                    if (type === 'text/xsl' || type === 'text/plain' || type === 'application/javascript') {
                        buf = buf.toString().replace(blogRegex, config.url.replace(/\/$/, ''));
                        buf = buf.toString().replace(apiRegex, config.apiUrl());
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
