/*
 * JavaScript Load Image Exif Map 1.0.2
 * https://github.com/blueimp/JavaScript-Load-Image
 *
 * Copyright 2013, Sebastian Tschan
 * https://blueimp.net
 *
 * Exif tags mapping based on
 * https://github.com/jseidelin/exif-js
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*global define, window */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define(['load-image', 'load-image-exif'], factory);
    } else {
        // Browser globals:
        factory(window.loadImage);
    }
}(function (loadImage) {
    'use strict';

    loadImage.ExifMap.prototype.tags = {
        // =================
        // TIFF tags (IFD0):
        // =================
        0x0100: 'ImageWidth',
        0x0101: 'ImageHeight',
        0x8769: 'ExifIFDPointer',
        0x8825: 'GPSInfoIFDPointer',
        0xA005: 'InteroperabilityIFDPointer',
        0x0102: 'BitsPerSample',
        0x0103: 'Compression',
        0x0106: 'PhotometricInterpretation',
        0x0112: 'Orientation',
        0x0115: 'SamplesPerPixel',
        0x011C: 'PlanarConfiguration',
        0x0212: 'YCbCrSubSampling',
        0x0213: 'YCbCrPositioning',
        0x011A: 'XResolution',
        0x011B: 'YResolution',
        0x0128: 'ResolutionUnit',
        0x0111: 'StripOffsets',
        0x0116: 'RowsPerStrip',
        0x0117: 'StripByteCounts',
        0x0201: 'JPEGInterchangeFormat',
        0x0202: 'JPEGInterchangeFormatLength',
        0x012D: 'TransferFunction',
        0x013E: 'WhitePoint',
        0x013F: 'PrimaryChromaticities',
        0x0211: 'YCbCrCoefficients',
        0x0214: 'ReferenceBlackWhite',
        0x0132: 'DateTime',
        0x010E: 'ImageDescription',
        0x010F: 'Make',
        0x0110: 'Model',
        0x0131: 'Software',
        0x013B: 'Artist',
        0x8298: 'Copyright',
        // ==================
        // Exif Sub IFD tags:
        // ==================
        0x9000: 'ExifVersion',                  // EXIF version
        0xA000: 'FlashpixVersion',              // Flashpix format version
        0xA001: 'ColorSpace',                   // Color space information tag
        0xA002: 'PixelXDimension',              // Valid width of meaningful image
        0xA003: 'PixelYDimension',              // Valid height of meaningful image
        0xA500: 'Gamma',
        0x9101: 'ComponentsConfiguration',      // Information about channels
        0x9102: 'CompressedBitsPerPixel',       // Compressed bits per pixel
        0x927C: 'MakerNote',                    // Any desired information written by the manufacturer
        0x9286: 'UserComment',                  // Comments by user
        0xA004: 'RelatedSoundFile',             // Name of related sound file
        0x9003: 'DateTimeOriginal',             // Date and time when the original image was generated
        0x9004: 'DateTimeDigitized',            // Date and time when the image was stored digitally
        0x9290: 'SubSecTime',                   // Fractions of seconds for DateTime
        0x9291: 'SubSecTimeOriginal',           // Fractions of seconds for DateTimeOriginal
        0x9292: 'SubSecTimeDigitized',          // Fractions of seconds for DateTimeDigitized
        0x829A: 'ExposureTime',                 // Exposure time (in seconds)
        0x829D: 'FNumber',
        0x8822: 'ExposureProgram',              // Exposure program
        0x8824: 'SpectralSensitivity',          // Spectral sensitivity
        0x8827: 'PhotographicSensitivity',      // EXIF 2.3, ISOSpeedRatings in EXIF 2.2
        0x8828: 'OECF',                         // Optoelectric conversion factor
        0x8830: 'SensitivityType',
        0x8831: 'StandardOutputSensitivity',
        0x8832: 'RecommendedExposureIndex',
        0x8833: 'ISOSpeed',
        0x8834: 'ISOSpeedLatitudeyyy',
        0x8835: 'ISOSpeedLatitudezzz',
        0x9201: 'ShutterSpeedValue',            // Shutter speed
        0x9202: 'ApertureValue',                // Lens aperture
        0x9203: 'BrightnessValue',              // Value of brightness
        0x9204: 'ExposureBias',                 // Exposure bias
        0x9205: 'MaxApertureValue',             // Smallest F number of lens
        0x9206: 'SubjectDistance',              // Distance to subject in meters
        0x9207: 'MeteringMode',                 // Metering mode
        0x9208: 'LightSource',                  // Kind of light source
        0x9209: 'Flash',                        // Flash status
        0x9214: 'SubjectArea',                  // Location and area of main subject
        0x920A: 'FocalLength',                  // Focal length of the lens in mm
        0xA20B: 'FlashEnergy',                  // Strobe energy in BCPS
        0xA20C: 'SpatialFrequencyResponse',
        0xA20E: 'FocalPlaneXResolution',        // Number of pixels in width direction per FPRUnit
        0xA20F: 'FocalPlaneYResolution',        // Number of pixels in height direction per FPRUnit
        0xA210: 'FocalPlaneResolutionUnit',     // Unit for measuring the focal plane resolution
        0xA214: 'SubjectLocation',              // Location of subject in image
        0xA215: 'ExposureIndex',                // Exposure index selected on camera
        0xA217: 'SensingMethod',                // Image sensor type
        0xA300: 'FileSource',                   // Image source (3 == DSC)
        0xA301: 'SceneType',                    // Scene type (1 == directly photographed)
        0xA302: 'CFAPattern',                   // Color filter array geometric pattern
        0xA401: 'CustomRendered',               // Special processing
        0xA402: 'ExposureMode',                 // Exposure mode
        0xA403: 'WhiteBalance',                 // 1 = auto white balance, 2 = manual
        0xA404: 'DigitalZoomRatio',             // Digital zoom ratio
        0xA405: 'FocalLengthIn35mmFilm',
        0xA406: 'SceneCaptureType',             // Type of scene
        0xA407: 'GainControl',                  // Degree of overall image gain adjustment
        0xA408: 'Contrast',                     // Direction of contrast processing applied by camera
        0xA409: 'Saturation',                   // Direction of saturation processing applied by camera
        0xA40A: 'Sharpness',                    // Direction of sharpness processing applied by camera
        0xA40B: 'DeviceSettingDescription',
        0xA40C: 'SubjectDistanceRange',         // Distance to subject
        0xA420: 'ImageUniqueID',                // Identifier assigned uniquely to each image
        0xA430: 'CameraOwnerName',
        0xA431: 'BodySerialNumber',
        0xA432: 'LensSpecification',
        0xA433: 'LensMake',
        0xA434: 'LensModel',
        0xA435: 'LensSerialNumber',
        // ==============
        // GPS Info tags:
        // ==============
        0x0000: 'GPSVersionID',
        0x0001: 'GPSLatitudeRef',
        0x0002: 'GPSLatitude',
        0x0003: 'GPSLongitudeRef',
        0x0004: 'GPSLongitude',
        0x0005: 'GPSAltitudeRef',
        0x0006: 'GPSAltitude',
        0x0007: 'GPSTimeStamp',
        0x0008: 'GPSSatellites',
        0x0009: 'GPSStatus',
        0x000A: 'GPSMeasureMode',
        0x000B: 'GPSDOP',
        0x000C: 'GPSSpeedRef',
        0x000D: 'GPSSpeed',
        0x000E: 'GPSTrackRef',
        0x000F: 'GPSTrack',
        0x0010: 'GPSImgDirectionRef',
        0x0011: 'GPSImgDirection',
        0x0012: 'GPSMapDatum',
        0x0013: 'GPSDestLatitudeRef',
        0x0014: 'GPSDestLatitude',
        0x0015: 'GPSDestLongitudeRef',
        0x0016: 'GPSDestLongitude',
        0x0017: 'GPSDestBearingRef',
        0x0018: 'GPSDestBearing',
        0x0019: 'GPSDestDistanceRef',
        0x001A: 'GPSDestDistance',
        0x001B: 'GPSProcessingMethod',
        0x001C: 'GPSAreaInformation',
        0x001D: 'GPSDateStamp',
        0x001E: 'GPSDifferential',
        0x001F: 'GPSHPositioningError'
    };

    loadImage.ExifMap.prototype.stringValues = {
        ExposureProgram: {
            0: 'Undefined',
            1: 'Manual',
            2: 'Normal program',
            3: 'Aperture priority',
            4: 'Shutter priority',
            5: 'Creative program',
            6: 'Action program',
            7: 'Portrait mode',
            8: 'Landscape mode'
        },
        MeteringMode: {
            0: 'Unknown',
            1: 'Average',
            2: 'CenterWeightedAverage',
            3: 'Spot',
            4: 'MultiSpot',
            5: 'Pattern',
            6: 'Partial',
            255: 'Other'
        },
        LightSource: {
            0: 'Unknown',
            1: 'Daylight',
            2: 'Fluorescent',
            3: 'Tungsten (incandescent light)',
            4: 'Flash',
            9: 'Fine weather',
            10: 'Cloudy weather',
            11: 'Shade',
            12: 'Daylight fluorescent (D 5700 - 7100K)',
            13: 'Day white fluorescent (N 4600 - 5400K)',
            14: 'Cool white fluorescent (W 3900 - 4500K)',
            15: 'White fluorescent (WW 3200 - 3700K)',
            17: 'Standard light A',
            18: 'Standard light B',
            19: 'Standard light C',
            20: 'D55',
            21: 'D65',
            22: 'D75',
            23: 'D50',
            24: 'ISO studio tungsten',
            255: 'Other'
        },
        Flash: {
            0x0000: 'Flash did not fire',
            0x0001: 'Flash fired',
            0x0005: 'Strobe return light not detected',
            0x0007: 'Strobe return light detected',
            0x0009: 'Flash fired, compulsory flash mode',
            0x000D: 'Flash fired, compulsory flash mode, return light not detected',
            0x000F: 'Flash fired, compulsory flash mode, return light detected',
            0x0010: 'Flash did not fire, compulsory flash mode',
            0x0018: 'Flash did not fire, auto mode',
            0x0019: 'Flash fired, auto mode',
            0x001D: 'Flash fired, auto mode, return light not detected',
            0x001F: 'Flash fired, auto mode, return light detected',
            0x0020: 'No flash function',
            0x0041: 'Flash fired, red-eye reduction mode',
            0x0045: 'Flash fired, red-eye reduction mode, return light not detected',
            0x0047: 'Flash fired, red-eye reduction mode, return light detected',
            0x0049: 'Flash fired, compulsory flash mode, red-eye reduction mode',
            0x004D: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected',
            0x004F: 'Flash fired, compulsory flash mode, red-eye reduction mode, return light detected',
            0x0059: 'Flash fired, auto mode, red-eye reduction mode',
            0x005D: 'Flash fired, auto mode, return light not detected, red-eye reduction mode',
            0x005F: 'Flash fired, auto mode, return light detected, red-eye reduction mode'
        },
        SensingMethod: {
            1: 'Undefined',
            2: 'One-chip color area sensor',
            3: 'Two-chip color area sensor',
            4: 'Three-chip color area sensor',
            5: 'Color sequential area sensor',
            7: 'Trilinear sensor',
            8: 'Color sequential linear sensor'
        },
        SceneCaptureType: {
            0: 'Standard',
            1: 'Landscape',
            2: 'Portrait',
            3: 'Night scene'
        },
        SceneType: {
            1: 'Directly photographed'
        },
        CustomRendered: {
            0: 'Normal process',
            1: 'Custom process'
        },
        WhiteBalance: {
            0: 'Auto white balance',
            1: 'Manual white balance'
        },
        GainControl: {
            0: 'None',
            1: 'Low gain up',
            2: 'High gain up',
            3: 'Low gain down',
            4: 'High gain down'
        },
        Contrast: {
            0: 'Normal',
            1: 'Soft',
            2: 'Hard'
        },
        Saturation: {
            0: 'Normal',
            1: 'Low saturation',
            2: 'High saturation'
        },
        Sharpness: {
            0: 'Normal',
            1: 'Soft',
            2: 'Hard'
        },
        SubjectDistanceRange: {
            0: 'Unknown',
            1: 'Macro',
            2: 'Close view',
            3: 'Distant view'
        },
        FileSource: {
            3: 'DSC'
        },
        ComponentsConfiguration: {
            0: '',
            1: 'Y',
            2: 'Cb',
            3: 'Cr',
            4: 'R',
            5: 'G',
            6: 'B'
        },
        Orientation: {
            1: 'top-left',
            2: 'top-right',
            3: 'bottom-right',
            4: 'bottom-left',
            5: 'left-top',
            6: 'right-top',
            7: 'right-bottom',
            8: 'left-bottom'
        }
    };

    loadImage.ExifMap.prototype.getText = function (id) {
        var value = this.get(id);
        switch (id) {
        case 'LightSource':
        case 'Flash':
        case 'MeteringMode':
        case 'ExposureProgram':
        case 'SensingMethod':
        case 'SceneCaptureType':
        case 'SceneType':
        case 'CustomRendered':
        case 'WhiteBalance':
        case 'GainControl':
        case 'Contrast':
        case 'Saturation':
        case 'Sharpness':
        case 'SubjectDistanceRange':
        case 'FileSource':
        case 'Orientation':
            return this.stringValues[id][value];
        case 'ExifVersion':
        case 'FlashpixVersion':
            return String.fromCharCode(value[0], value[1], value[2], value[3]);
        case 'ComponentsConfiguration':
            return this.stringValues[id][value[0]] +
                this.stringValues[id][value[1]] +
                this.stringValues[id][value[2]] +
                this.stringValues[id][value[3]];
        case 'GPSVersionID':
            return value[0] + '.' + value[1]  + '.' + value[2]  + '.' + value[3];
        }
        return String(value);
    };

    (function (exifMapPrototype) {
        var tags = exifMapPrototype.tags,
            map = exifMapPrototype.map,
            prop;

        // Map the tag names to tags:
        for (prop in tags) {
            if (tags.hasOwnProperty(prop)) {
                map[tags[prop]] = prop;
            }
        }
    }(loadImage.ExifMap.prototype));

    loadImage.ExifMap.prototype.getAll = function () {
        var map = {},
            prop,
            id;
        for (prop in this) {
            if (this.hasOwnProperty(prop)) {
                id = this.tags[prop];
                if (id) {
                    map[id] = this.getText(id);
                }
            }
        }
        return map;
    };

}));
