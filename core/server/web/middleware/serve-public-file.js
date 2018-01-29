'use strict';

const crypto = require('crypto'),
    fileCache = require('../../services/file/cache');

// Handles requests to any public Ghost asset
function servePublicFile(file, type, maxAge) {
    return function servePublicFile(req, res, next) {
        const revPath = require('rev-path'),
            hash = fileCache.public.getHash(file);

        let filePath;

        // @TODO: what if you send an old asset hash???
        if (hash) {
            filePath = revPath.revert(req.path, hash);
        }

        if (hash && filePath === '/' + file) {
            let cachedFile = fileCache.public.get(file);

            res.writeHead(200, {
                'Content-Type': type,
                'Content-Length': cachedFile.length,
                ETag: '"' + crypto.createHash('md5').update(cachedFile, 'utf8').digest('hex') + '"',
                'Cache-Control': 'public, max-age=' + maxAge
            });

            res.end(cachedFile);
        } else {
            return next();
        }
    };
}

module.exports = servePublicFile;
