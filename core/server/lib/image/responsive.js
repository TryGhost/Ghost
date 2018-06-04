var path = require('path'),
    fs = require('fs'),
    jimp = require('jimp'),
    cheerio = require('cheerio'),
    url = require('../../services/url').utils,
    config = require('../../config'),
    imageSizes = config.get('images').sizes,
    quality = config.get('images').quality;

// Replace <img src="" /> tags with src replaced with lowest resolution image and srcset
// Effectively delegating decision to consume higher resolution image assets to client
// @see https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images
module.exports.imgs = function imgs(html) {
    var content = cheerio.load(html, {decodeEntities: false}),
        re = new RegExp('^/' + url.STATIC_IMAGE_URL_PREFIX);

    content('img').each(function (i, img) {
        img = content(img);
        var uri = img.attr('src');
        // local image without an existing srcset
        if (uri.match(re) && !img.attr('srcset')) {
            img.attr('srcset', srcset(uri));
            img.attr('sizes', sizes());
            img.attr('src', src(uri));
        }
    });

    return content.html();
};

// Return the local filesystem path for an image src path
function systemPath(src) {
    var base = config.getContentPath('images').replace('/' + url.STATIC_IMAGE_URL_PREFIX, '');
    return path.join(base, src);
}

// Generate the filename encoding the size and quality, e.g.:
// `/content/images/my-upload.jpg` returns
// `/content/images/my-upload@640q80.jpg`
function resizedURI(src, size, quality) {
    var re = new RegExp('(.+)\\.([a-z0-9]+)$'),
        parsed = src.match(re);

    return [
        parsed[1],
        '@', size,
        'q', quality,
        '.', parsed[2]
    ].join('');
}

// Returns a resized filename (via `resizedURI()`) as well as creates the
// resized, optimized image on the local filesystem when it does not exist.
function resizedImage(src, size, quality) {
    var resized = resizedURI(src, size, quality);

    var paths = {
        original: systemPath(src),
        resized: systemPath(resized)
    };

    if (!fs.existsSync(paths.resized)) {
        jimp.read(paths.original).then(function (image) {
            image.scaleToFit(size, size)
                .quality(quality)
                .write(paths.resized);
        });
    }

    return resized;
}

// Return a string for use with `img.srcset` html attribute
function srcset(src) {
    return imageSizes.map(function (px) {
        var density = px + 'w';
        return [resizedImage(src, px, quality), density].join(' ');
    }).join(', ');
}

// Return a string for use with `img.sizes` html attribute
function sizes() {
    return imageSizes.map(function (px, i) {
        var w = px + 'px';
        if (i === imageSizes.length) {
            return w;
        }
        return ['(max-width: ' + w + ')', w].join(' ');
    }).join(', ');
}

// Return an optimized default for an original for use with `img.src` attribute
function src(src) {
    return resizedImage(src, imageSizes[0], quality);
}
