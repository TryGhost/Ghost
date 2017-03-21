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
    errors       = require('../errors'),

    _private = {};

_private.prepareImagePath = function prepareImagePath(imagePath) {
    // check if we got an url without any protocol
    if (imagePath.indexOf('http') === -1) {
        // our gravatar urls start with '//' in that case add 'https:'
        if (imagePath.indexOf('//') === 0) {
            // it's a gravatar url
            imagePath = 'https:' + imagePath;
        } else {
            // get absolute url for image
            imagePath = config.urlFor('image', {image: imagePath}, true);
        }
    }

    return imagePath;
};

_private.error = function error(error, imagePath) {
    var error = new errors.InternalServerError(error);
    error.context = imagePath;

    return reject(error)
};

/**
 * @description read image dimensions from URL
 * @param {String} imagePath
 * @param {Number} timeout (optional)
 * @returns {Promise<Object>} imageObject or error
 */
module.exports.getImageSizeFromUrl = function getImageSizeFromUrl(imagePath) {
    return new Promise(function imageSizeRequest(resolve, reject) {
        var imageObject = {
                // store the original value
                url: imagePath
            },
            options,
            // set default timeout if called without option. Otherwise node will use default timeout of 120 sec.
            timeout = config.times.imageSizeLookupTimeout || 10000,
            timer,
            timerEnded = false,
            request,
            requestHandler;

        // Get our options for the request
        options = url.parse(_private.prepareImagePath(imagePath));
        options.headers = {'User-Agent': 'Mozilla/5.0'};

        requestHandler = options.protocol.indexOf('https') === 0 ? https : http;

        request = requestHandler.get(options, function (response) {
            clearTimeout(timer);
            var chunks = [];

            response.on('data', function (chunk) {
                chunks.push(chunk);
            });

            response.on('end', function () {
                if (response.statusCode === 200) {
                    try {
                        var dimensions = sizeOf(Buffer.concat(chunks));

                        imageObject.width = dimensions.width;
                        imageObject.height = dimensions.height;

                        return resolve(imageObject);
                    } catch (err) {
                        return reject(_private.error(err, imagePath));
                    }
                } else {
                    return reject(_private.error('Request returned bad statusCode: ' + response.statusCode, imagePath));
                }
            });
        });

        request.on('error', function (err) {
            clearTimeout(timer);
            // reject with error
            if (!timerEnded) {
                return reject(_private.error(err, imagePath));
            }
        });

        timer = setTimeout(function () {
            timerEnded = true;
            request.abort();
            return reject(_private.error('Timeout: request took longer than: ' + timeout, imagePath));
        }, timeout);
    });
};
