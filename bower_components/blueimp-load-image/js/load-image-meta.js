/*
 * JavaScript Load Image Meta 1.0.2
 * https://github.com/blueimp/JavaScript-Load-Image
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Image meta data handling implementation
 * based on the help and contribution of
 * Achim Stöhr.
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*jslint continue:true */
/*global define, window, DataView, Blob, Uint8Array, console */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define(['load-image'], factory);
    } else {
        // Browser globals:
        factory(window.loadImage);
    }
}(function (loadImage) {
    'use strict';

    var hasblobSlice = window.Blob && (Blob.prototype.slice ||
            Blob.prototype.webkitSlice || Blob.prototype.mozSlice);

    loadImage.blobSlice = hasblobSlice && function () {
        var slice = this.slice || this.webkitSlice || this.mozSlice;
        return slice.apply(this, arguments);
    };

    loadImage.metaDataParsers = {
        jpeg: {
            0xffe1: [] // APP1 marker
        }
    };

    // Parses image meta data and calls the callback with an object argument
    // with the following properties:
    // * imageHead: The complete image head as ArrayBuffer (Uint8Array for IE10)
    // The options arguments accepts an object and supports the following properties:
    // * maxMetaDataSize: Defines the maximum number of bytes to parse.
    // * disableImageHead: Disables creating the imageHead property.
    loadImage.parseMetaData = function (file, callback, options) {
        options = options || {};
        var that = this,
            // 256 KiB should contain all EXIF/ICC/IPTC segments:
            maxMetaDataSize = options.maxMetaDataSize || 262144,
            data = {},
            noMetaData = !(window.DataView  && file && file.size >= 12 &&
                file.type === 'image/jpeg' && loadImage.blobSlice);
        if (noMetaData || !loadImage.readFile(
                loadImage.blobSlice.call(file, 0, maxMetaDataSize),
                function (e) {
                    if (e.target.error) {
                        // FileReader error
                        console.log(e.target.error);
                        callback(data);
                        return;
                    }
                    // Note on endianness:
                    // Since the marker and length bytes in JPEG files are always
                    // stored in big endian order, we can leave the endian parameter
                    // of the DataView methods undefined, defaulting to big endian.
                    var buffer = e.target.result,
                        dataView = new DataView(buffer),
                        offset = 2,
                        maxOffset = dataView.byteLength - 4,
                        headLength = offset,
                        markerBytes,
                        markerLength,
                        parsers,
                        i;
                    // Check for the JPEG marker (0xffd8):
                    if (dataView.getUint16(0) === 0xffd8) {
                        while (offset < maxOffset) {
                            markerBytes = dataView.getUint16(offset);
                            // Search for APPn (0xffeN) and COM (0xfffe) markers,
                            // which contain application-specific meta-data like
                            // Exif, ICC and IPTC data and text comments:
                            if ((markerBytes >= 0xffe0 && markerBytes <= 0xffef) ||
                                    markerBytes === 0xfffe) {
                                // The marker bytes (2) are always followed by
                                // the length bytes (2), indicating the length of the
                                // marker segment, which includes the length bytes,
                                // but not the marker bytes, so we add 2:
                                markerLength = dataView.getUint16(offset + 2) + 2;
                                if (offset + markerLength > dataView.byteLength) {
                                    console.log('Invalid meta data: Invalid segment size.');
                                    break;
                                }
                                parsers = loadImage.metaDataParsers.jpeg[markerBytes];
                                if (parsers) {
                                    for (i = 0; i < parsers.length; i += 1) {
                                        parsers[i].call(
                                            that,
                                            dataView,
                                            offset,
                                            markerLength,
                                            data,
                                            options
                                        );
                                    }
                                }
                                offset += markerLength;
                                headLength = offset;
                            } else {
                                // Not an APPn or COM marker, probably safe to
                                // assume that this is the end of the meta data
                                break;
                            }
                        }
                        // Meta length must be longer than JPEG marker (2)
                        // plus APPn marker (2), followed by length bytes (2):
                        if (!options.disableImageHead && headLength > 6) {
                            if (buffer.slice) {
                                data.imageHead = buffer.slice(0, headLength);
                            } else {
                                // Workaround for IE10, which does not yet
                                // support ArrayBuffer.slice:
                                data.imageHead = new Uint8Array(buffer)
                                    .subarray(0, headLength);
                            }
                        }
                    } else {
                        console.log('Invalid JPEG file: Missing JPEG marker.');
                    }
                    callback(data);
                },
                'readAsArrayBuffer'
            )) {
            callback(data);
        }
    };

}));
