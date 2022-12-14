const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const config = require('../../../shared/config');
const {blogIcon} = require('../../../server/lib/image');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');

let content;

const buildContentResponse = (ext, buf) => {
    content = {
        headers: {
            'Content-Type': `image/${ext}`,
            'Content-Length': buf.length,
            ETag: `"${crypto.createHash('md5').update(buf, 'utf8').digest('hex')}"`,
            'Cache-Control': `public, max-age=${config.get('caching:favicon:maxAge')}`
        },
        body: buf
    };

    return content;
};

// ### serveFavicon Middleware
// Handles requests to favicon.png and favicon.ico
function serveFavicon() {
    let filePath;

    return function serveFaviconMiddleware(req, res, next) {
        if (req.path.match(/^\/favicon\.(ico|png|jpe?g)/i)) {
            // CASE: favicon is default
            // confusing: if you upload an icon, it's same logic as storing images
            // we store as /content/images, because this is the url path images get requested via the browser
            // we are using an express route to skip /content/images and the result is a image path
            // based on config.getContentPath('images') + req.path
            // in this case we don't use path rewrite, that's why we have to make it manually
            filePath = blogIcon.getIconPath();

            let originalExtension = path.extname(filePath).toLowerCase();
            const requestedExtension = path.extname(req.path).toLowerCase();

            // CASE: custom favicon exists, load it from local file storage
            if (settingsCache.get('icon')) {
                // Always redirect to the icon path, which is never favicon.xxx
                return res.redirect(302, blogIcon.getIconUrl());
            } else {
                originalExtension = path.extname(filePath).toLowerCase();

                // CASE: always redirect to .ico for default icon
                if (originalExtension !== requestedExtension) {
                    return res.redirect(302, urlUtils.urlFor({relativeUrl: '/favicon.ico'}));
                }

                fs.readFile(filePath, (err, buf) => {
                    if (err) {
                        return next(err);
                    }

                    content = buildContentResponse('x-icon', buf);

                    res.writeHead(200, content.headers);
                    res.end(content.body);
                });
            }
        } else {
            return next();
        }
    };
}

module.exports = serveFavicon;
