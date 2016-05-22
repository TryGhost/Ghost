var fs = require('fs'),
    path = require('path'),
    tnvConfig = {
        processes: 4,
        testFilePostfix: '_spec.js',
        applicationPath: path.normalize(__dirname + '/../../'),
        testFolderPath: path.normalize(__dirname + '/../../core/test'),
        utilsPath: path.normalize(__dirname + '/../../core/test/utils')
    };

fs.writeFileSync(__dirname + '/mocha-tnv.json', JSON.stringify(tnvConfig));
