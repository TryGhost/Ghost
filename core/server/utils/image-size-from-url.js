// Supported formats of https://github.com/image-size/image-size:
// BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG
// ***
// Takes the url of the image and an optional timeout
// getImageSizeFromUrl returns an Object like this
// {
//     height: 50,
//     url: 'http://myblog.com/images/cat.jpg',
//     width: 50
// };
// if the dimensions can be fetched and rejects with error, if not.
// ***
// In case we get a locally stored image or a not complete url (like //www.gravatar.com/andsoon),
// we add the protocol to the incomplete one and use urlFor() to get the absolute URL.
// If the request fails or image-size is not able to read the file, we reject with error.

var sizeOf       = require('image-size'),
    url          = require('url'),
    Promise      = require('bluebird'),
    http         = require('http'),
    https        = require('https'),
    config       = require('../config'),
    dimensions,
    request,
    requestHandler;

/**
 * @description read image dimensions from URL
 * @param {String} imagePath
 * @param {Number} timeout (optional)
 * @returns {Promise<Object>} imageObject or error
 */
module.exports.getImageSizeFromUrl = function getImageSizeFromUrl(imagePath, timeout) {
    return new Promise(function imageSizeRequest(resolve, reject) {
        var imageObject = {},
            options;

        imageObject.url = imagePath;

        // check if we got an url without any protocol
        if (imagePath.indexOf('http') === -1) {
            // our gravatar urls start with '//' in that case add 'http:'
            if (imagePath.indexOf('//') === 0) {
                // it's a gravatar url
                imagePath = 'http:' + imagePath;
            } else {
                // get absolute url for image
                imagePath = config.urlFor('image', {image: imagePath}, true);
            }
        }

        options = url.parse(imagePath);

        requestHandler = imagePath.indexOf('https') === 0 ? https : http;
        options.headers = {'User-Agent': 'Mozilla/5.0'};

        request = requestHandler.get(options, function (res) {
            var chunks = [];

            res.on('data', function (chunk) {
                chunks.push(chunk);
            });

            res.on('end', function () {
                if (res.statusCode === 200) {
                    try {
                        dimensions = sizeOf(Buffer.concat(chunks));

                        imageObject.width = dimensions.width;
                        imageObject.height = dimensions.height;

                        return resolve(imageObject);
                    } catch (err) {
                        // @ToDo: add real error handling here as soon as we have error logging
                        return reject(err);
                    }
                } else {
                    // @ToDo: add real error handling here as soon as we have error logging
                    var err = new Error();
                    err.message = imagePath;
                    err.statusCode = res.statusCode;

                    return reject(err);
                }
            });
        }).on('socket', function (socket) {
            // don't set timeout if no timeout give as argument
            if (timeout) {
                socket.setTimeout(timeout);
                socket.on('timeout', function () {
                    request.abort();
                });
            }
        }).on('error', function (err) {
            // @ToDo: add real error handling here as soon as we have error logging

            return reject(err);
        });
    });
};
