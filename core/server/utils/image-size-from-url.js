// Supported formats of https://github.com/image-size/image-size:
// BMP
// GIF
// JPEG
// PNG
// PSD
// TIFF
// WebP
// SVG

var sizeOf = require('image-size'),
    url = require('url'),
    Promise = require('bluebird'),
    http = require('http'),
    https = require('https'),
    dimensions,
    request,
    prot;

module.exports.getImageSizeFromUrl = function getImageSizeFromUrl(imagePath, timeout) {
    return new Promise(function imageSizeRequest(resolve) {
        var timer,
            imageObject = {},
            timerEnded = false,
            options = url.parse(imagePath);

        imageObject.url = imagePath;
        prot = imagePath.indexOf('https') === 0 ? https : http;
        options.headers = {'User-Agent': 'Mozilla/5.0'};

        request = prot.get(options, function (res) {
            var chunks = [];
            clearTimeout(timer);

            res.on('data', function (chunk) {
                chunks.push(chunk);
            });

            res.on('end', function () {
                if (res.statusCode === 200 && !timerEnded) {
                    try {
                        dimensions = sizeOf(Buffer.concat(chunks));

                        imageObject.width = dimensions.width;
                        imageObject.height = dimensions.height;

                        return resolve(imageObject);
                    } catch (err) {
                        // @ToDo: add real error handling here as soon as we have error logging
                        return resolve(imagePath);
                    }
                } else {
                    return resolve(imagePath);
                }
            });
        }).on('error', function () {
            clearTimeout(timer);
            // just resolve with no image url
            if (!timerEnded) {
                return resolve(imagePath);
            }
        });
        timer = setTimeout(function () {
            timerEnded = true;
            request.abort();

            return resolve(imagePath);
        }, timeout || 2000);
    });
};
