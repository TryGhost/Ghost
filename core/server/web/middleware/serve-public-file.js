var crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    config = require('../../config'),
    urlService = require('../../services/url');

// ### servePublicFile Middleware
// Handles requests to robots.txt and favicon.ico (and caches them)
function servePublicFile(file, type, maxAge) {
    var content,
        publicFilePath = config.get('paths').publicFilePath,
        filePath,
        blogRegex = /(\{\{blog-url\}\})/g,
        apiRegex = /(\{\{api-url\}\})/g;

    filePath = file.match(/^public/) ? path.join(publicFilePath, file.replace(/^public/, '')) : path.join(publicFilePath, file);

    return function servePublicFile(req, res, next) {
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
                        buf = buf.toString().replace(blogRegex, urlService.utils.urlFor('home', true).replace(/\/$/, ''));
                        buf = buf.toString().replace(apiRegex, urlService.utils.urlFor('api', {cors: true}, true));
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
            return next();
        }
    };
}

module.exports = servePublicFile;
