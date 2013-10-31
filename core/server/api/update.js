var Ghost         = require('../../ghost'),
    package_json  = require('../../../package.json'),
    dataExport    = require('../data/export'),
    fs            = require('fs-extra'),
    zlip          = require('zlib'),
    path          = require('path'),
    when          = require('when'),
    nodefn        = require('when/node/function'),
    _             = require('underscore'),
    semver        = require('semver'),
    request       = require('request'),
    AdmZip        = require('adm-zip'),

    ghost         = new Ghost(),
    latestUrl     = 'https://ghost.org/zip/ghost-latest.zip',
    versionRegEx  = /([0-9]+\.[0-9]+\.[0-9]+)\.zip$/;

function check(req, res) {
    var result,
        versionMatches;

    result = {
        isUpdateAvailable: false,
        currentVersion: package_json.version,
        newVersion: null
    };

    request.get(latestUrl, { followRedirect: false }, function (error, response, body) {
        if (error) {
            return res.send(500, {
                detail: error && error.message ? error.message : 'Unknown error'
            });
        }
        if (response.statusCode !== 302) {
            return res.send(500, {
                detail: 'Received an unexpected response code of ' + response.statusCode + '.'
            });
        }
        if (!response.headers || !response.headers.location) {
            return res.send(500, {
                detail: 'Unable to find "location" in response header.'
            });
        }

        versionMatches = versionRegEx.exec(response.headers.location);

        if (!versionMatches || versionMatches.length !== 2) {
            return res.send(500, {
                detail: 'Unable to parse "location" response header.'
            });
        }

        result.newVersion = versionMatches[1];

        try {
            result.isUpdateAvailable = semver.lt(result.currentVersion, result.newVersion);
        } catch (er) {
            return res.send(500, {
                detail: 'Unable to compare versions. Detail: ' + (er && er.message ? er.message : 'unknown') + '.'
            });
        }


        return res.send(200, result);
    });
}

function extractUpdate(result, targetFile, req, res) {
    try {
        var zip = new AdmZip(targetFile);
        zip.extractAllTo(path.resolve('.'), true);

        // Delete the zip file
        fs.unlink(targetFile, function (error) {
            if (error) {
                result.detail = 'Failed to cleanup upgrade files. Detail: ' + error.message + '.';
                return res.send(500, result);
            }

            result.success = true;
            res.send(200, result);
        });
    } catch (error) {
        result.detail = 'Failed to extract upgrade files. Detail: ' + error.message + '.';
        res.send(500, result);
    }
}

function getLatestVersion(result, req, res) {
    var targetFile = path.resolve('content/tmp', 'ghost-latest.zip');

    request.get(latestUrl).pipe(fs.createWriteStream(targetFile)).on('finish', function () {
        return extractUpdate(result, targetFile, req, res);
    }).on('error', function (error) {
        result.detail = 'Unable to save upgrade archive to disk. Detail: ' + error.message + '.';
        return res.send(500, result);
    });
}

function backupDatabase(result, req, res) {
    dataExport().then(function (exportedData) {
        // Save the exported data to the file system for download
        var fileName = path.resolve(__dirname + '/../../server/data/export/exported-' + (new Date().getTime()) + '.json');

        return nodefn.call(fs.writeFile, fileName, JSON.stringify(exportedData));
    }).then(function () {
        return getLatestVersion(result, req, res);
    }).otherwise(function onError(error) {
        result.detail = 'Unable to backup database. Detail: ' + error.message + '.';
        return res.send(500, result);
    });
}

function run(req, res) {
    var result,
        tmpDirectory = path.resolve('content/tmp');

    result = {
        success: false,
        detail: null
    };

    // Create 'tmp' directory if it doesn't exist already
    fs.exists(tmpDirectory, function (exists) {
        if (exists) {
            return backupDatabase(result, req, res);
        }

        fs.mkdir(tmpDirectory, function (error) {
            if (error) {
                result.detail = 'Unable to create temporary directory. Detail: ' + error.message + '.';
                return res.send(500, result);
            }

            return backupDatabase(result, req, res);
        });
    });
}

module.exports = {
    check: check,
    run: run
};