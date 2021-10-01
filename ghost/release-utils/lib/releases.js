const fs = require('fs');
const os = require('os');
const _ = require('lodash');
const Promise = require('bluebird');
const requestPromise = require('request-promise');
const request = require('request');

const localUtils = require('./utils');

module.exports.create = (options = {}) => {
    let draft = true;
    let prerelease = false;

    localUtils.checkMissingOptions(options,
        'changelogPath',
        'github',
        'github.token',
        'userAgent',
        'uri',
        'tagName',
        'releaseName'
    );

    if (Object.prototype.hasOwnProperty.call(options, 'draft')) {
        draft = options.draft;
    }

    if (Object.prototype.hasOwnProperty.call(options, 'prerelease')) {
        prerelease = options.prerelease;
    }

    let body = [];
    // CASE: changelogPath can be array of paths with content
    if (_.isArray(options.changelogPath)) {
        options.changelogPath.forEach((opts) => {
            body = body.concat(localUtils.getFinalChangelog(opts));
        });
    } else {
        // CASE: changelogPath can be a single path(For backward compatibility)
        body = body.concat(localUtils.getFinalChangelog(options));
    }

    // CASE: clean before upload
    body = body.filter((item) => {
        return item !== undefined;
    });

    if (options.gistUrl) {
        body.push('');
        body.push('You can see the [full change log](' + options.gistUrl + ') for the details of every change included in this release.');
    }

    if (options.extraText) {
        body.push('');
        body.push(options.extraText);
    }

    const auth = 'token ' + options.github.token;

    const reqOptions = {
        uri: options.uri,
        headers: {
            'User-Agent': options.userAgent,
            Authorization: auth
        },
        method: 'POST',
        body: {
            tag_name: options.tagName,
            target_commitish: options.targetRef || 'main',
            name: options.releaseName,
            body: body.join(os.EOL),
            draft: draft,
            prerelease: prerelease
        },
        json: true,
        resolveWithFullResponse: true
    };

    return requestPromise(reqOptions)
        .then((response) => {
            return {
                id: response.body.id,
                releaseUrl: response.body.html_url,
                uploadUrl: response.body.upload_url
            };
        });
};

module.exports.uploadZip = (options = {}) => {
    localUtils.checkMissingOptions(options,
        'zipPath',
        'github',
        'github.token',
        'userAgent',
        'uri'
    );

    const auth = 'token ' + options.github.token;
    const stats = fs.statSync(options.zipPath);

    const reqOptions = {
        uri: options.uri,
        headers: {
            'User-Agent': options.userAgent,
            Authorization: auth,
            'Content-Type': 'application/zip',
            'Content-Length': stats.size
        },
        method: 'POST',
        json: true,
        resolveWithFullResponse: true
    };

    return new Promise((resolve, reject) => {
        fs.createReadStream(options.zipPath)
            .on('error', reject)
            .pipe(request.post(reqOptions, (err, res) => {
                if (err) {
                    return reject(err);
                }

                resolve({
                    downloadUrl: res.body.browser_download_url
                });
            }));
    });
};

module.exports.get = (options = {}) => {
    localUtils.checkMissingOptions(options,
        'userAgent',
        'uri'
    );

    const reqOptions = {
        uri: options.uri,
        headers: {
            'User-Agent': options.userAgent
        },
        method: 'GET',
        json: true
    };

    return requestPromise(reqOptions)
        .then((response) => {
            return response;
        });
};
