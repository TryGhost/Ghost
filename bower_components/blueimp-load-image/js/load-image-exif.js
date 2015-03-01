/*
 * JavaScript Load Image Exif Parser 1.0.0
 * https://github.com/blueimp/JavaScript-Load-Image
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*jslint unparam: true */
/*global define, window, console */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define(['load-image', 'load-image-meta'], factory);
    } else {
        // Browser globals:
        factory(window.loadImage);
    }
}(function (loadImage) {
    'use strict';

    loadImage.ExifMap = function () {
        return this;
    };

    loadImage.ExifMap.prototype.map = {
        'Orientation': 0x0112
    };

    loadImage.ExifMap.prototype.get = function (id) {
        return this[id] || this[this.map[id]];
    };

    loadImage.getExifThumbnail = function (dataView, offset, length) {
        var hexData,
            i,
            b;
        if (!length || offset + length > dataView.byteLength) {
            console.log('Invalid Exif data: Invalid thumbnail data.');
            return;
        }
        hexData = [];
        for (i = 0; i < length; i += 1) {
            b = dataView.getUint8(offset + i);
            hexData.push((b < 16 ? '0' : '') + b.toString(16));
        }
        return 'data:image/jpeg,%' + hexData.join('%');
    };

    loadImage.exifTagTypes = {
        // byte, 8-bit unsigned int:
        1: {
            getValue: function (dataView, dataOffset) {
                return dataView.getUint8(dataOffset);
            },
            size: 1
        },
        // ascii, 8-bit byte:
        2: {
            getValue: function (dataView, dataOffset) {
                return String.fromCharCode(dataView.getUint8(dataOffset));
            },
            size: 1,
            ascii: true
        },
        // short, 16 bit int:
        3: {
            getValue: function (dataView, dataOffset, littleEndian) {
                return dataView.getUint16(dataOffset, littleEndian);
            },
            size: 2
        },
        // long, 32 bit int:
        4: {
            getValue: function (dataView, dataOffset, littleEndian) {
                return dataView.getUint32(dataOffset, littleEndian);
            },
            size: 4
        },
        // rational = two long values, first is numerator, second is denominator:
        5: {
            getValue: function (dataView, dataOffset, littleEndian) {
                return dataView.getUint32(dataOffset, littleEndian) /
                    dataView.getUint32(dataOffset + 4, littleEndian);
            },
            size: 8
        },
        // slong, 32 bit signed int:
        9: {
            getValue: function (dataView, dataOffset, littleEndian) {
                return dataView.getInt32(dataOffset, littleEndian);
            },
            size: 4
        },
        // srational, two slongs, first is numerator, second is denominator:
        10: {
            getValue: function (dataView, dataOffset, littleEndian) {
                return dataView.getInt32(dataOffset, littleEndian) /
                    dataView.getInt32(dataOffset + 4, littleEndian);
            },
            size: 8
        }
    };
    // undefined, 8-bit byte, value depending on field:
    loadImage.exifTagTypes[7] = loadImage.exifTagTypes[1];

    loadImage.getExifValue = function (dataView, tiffOffset, offset, type, length, littleEndian) {
        var tagType = loadImage.exifTagTypes[type],
            tagSize,
            dataOffset,
            values,
            i,
            str,
            c;
        if (!tagType) {
            console.log('Invalid Exif data: Invalid tag type.');
            return;
        }
        tagSize = tagType.size * length;
        // Determine if the value is contained in the dataOffset bytes,
        // or if the value at the dataOffset is a pointer to the actual data:
        dataOffset = tagSize > 4 ?
                tiffOffset + dataView.getUint32(offset + 8, littleEndian) : (offset + 8);
        if (dataOffset + tagSize > dataView.byteLength) {
            console.log('Invalid Exif data: Invalid data offset.');
            return;
        }
        if (length === 1) {
            return tagType.getValue(dataView, dataOffset, littleEndian);
        }
        values = [];
        for (i = 0; i < length; i += 1) {
            values[i] = tagType.getValue(dataView, dataOffset + i * tagType.size, littleEndian);
        }
        if (tagType.ascii) {
            str = '';
            // Concatenate the chars:
            for (i = 0; i < values.length; i += 1) {
                c = values[i];
                // Ignore the terminating NULL byte(s):
                if (c === '\u0000') {
                    break;
                }
                str += c;
            }
            return str;
        }
        return values;
    };

    loadImage.parseExifTag = function (dataView, tiffOffset, offset, littleEndian, data) {
        var tag = dataView.getUint16(offset, littleEndian);
        data.exif[tag] = loadImage.getExifValue(
            dataView,
            tiffOffset,
            offset,
            dataView.getUint16(offset + 2, littleEndian), // tag type
            dataView.getUint32(offset + 4, littleEndian), // tag length
            littleEndian
        );
    };

    loadImage.parseExifTags = function (dataView, tiffOffset, dirOffset, littleEndian, data) {
        var tagsNumber,
            dirEndOffset,
            i;
        if (dirOffset + 6 > dataView.byteLength) {
            console.log('Invalid Exif data: Invalid directory offset.');
            return;
        }
        tagsNumber = dataView.getUint16(dirOffset, littleEndian);
        dirEndOffset = dirOffset + 2 + 12 * tagsNumber;
        if (dirEndOffset + 4 > dataView.byteLength) {
            console.log('Invalid Exif data: Invalid directory size.');
            return;
        }
        for (i = 0; i < tagsNumber; i += 1) {
            this.parseExifTag(
                dataView,
                tiffOffset,
                dirOffset + 2 + 12 * i, // tag offset
                littleEndian,
                data
            );
        }
        // Return the offset to the next directory:
        return dataView.getUint32(dirEndOffset, littleEndian);
    };

    loadImage.parseExifData = function (dataView, offset, length, data, options) {
        if (options.disableExif) {
            return;
        }
        var tiffOffset = offset + 10,
            littleEndian,
            dirOffset,
            thumbnailData;
        // Check for the ASCII code for "Exif" (0x45786966):
        if (dataView.getUint32(offset + 4) !== 0x45786966) {
            // No Exif data, might be XMP data instead
            return;
        }
        if (tiffOffset + 8 > dataView.byteLength) {
            console.log('Invalid Exif data: Invalid segment size.');
            return;
        }
        // Check for the two null bytes:
        if (dataView.getUint16(offset + 8) !== 0x0000) {
            console.log('Invalid Exif data: Missing byte alignment offset.');
            return;
        }
        // Check the byte alignment:
        switch (dataView.getUint16(tiffOffset)) {
        case 0x4949:
            littleEndian = true;
            break;
        case 0x4D4D:
            littleEndian = false;
            break;
        default:
            console.log('Invalid Exif data: Invalid byte alignment marker.');
            return;
        }
        // Check for the TIFF tag marker (0x002A):
        if (dataView.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) {
            console.log('Invalid Exif data: Missing TIFF marker.');
            return;
        }
        // Retrieve the directory offset bytes, usually 0x00000008 or 8 decimal:
        dirOffset = dataView.getUint32(tiffOffset + 4, littleEndian);
        // Create the exif object to store the tags:
        data.exif = new loadImage.ExifMap();
        // Parse the tags of the main image directory and retrieve the
        // offset to the next directory, usually the thumbnail directory:
        dirOffset = loadImage.parseExifTags(
            dataView,
            tiffOffset,
            tiffOffset + dirOffset,
            littleEndian,
            data
        );
        if (dirOffset && !options.disableExifThumbnail) {
            thumbnailData = {exif: {}};
            dirOffset = loadImage.parseExifTags(
                dataView,
                tiffOffset,
                tiffOffset + dirOffset,
                littleEndian,
                thumbnailData
            );
            // Check for JPEG Thumbnail offset:
            if (thumbnailData.exif[0x0201]) {
                data.exif.Thumbnail = loadImage.getExifThumbnail(
                    dataView,
                    tiffOffset + thumbnailData.exif[0x0201],
                    thumbnailData.exif[0x0202] // Thumbnail data length
                );
            }
        }
        // Check for Exif Sub IFD Pointer:
        if (data.exif[0x8769] && !options.disableExifSub) {
            loadImage.parseExifTags(
                dataView,
                tiffOffset,
                tiffOffset + data.exif[0x8769], // directory offset
                littleEndian,
                data
            );
        }
        // Check for GPS Info IFD Pointer:
        if (data.exif[0x8825] && !options.disableExifGps) {
            loadImage.parseExifTags(
                dataView,
                tiffOffset,
                tiffOffset + data.exif[0x8825], // directory offset
                littleEndian,
                data
            );
        }
    };

    // Registers the Exif parser for the APP1 JPEG meta data segment:
    loadImage.metaDataParsers.jpeg[0xffe1].push(loadImage.parseExifData);

    // Adds the following properties to the parseMetaData callback data:
    // * exif: The exif tags, parsed by the parseExifData method

    // Adds the following options to the parseMetaData method:
    // * disableExif: Disables Exif parsing.
    // * disableExifThumbnail: Disables parsing of the Exif Thumbnail.
    // * disableExifSub: Disables parsing of the Exif Sub IFD.
    // * disableExifGps: Disables parsing of the Exif GPS Info IFD.

}));
