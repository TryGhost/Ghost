const fs = require('fs');
const os = require('os');
const _ = require('lodash');
const Promise = require('bluebird');
const requestPromise = require('request-promise');
const request = require('request');

const localUtils = require('./utils');

function getFinalChangelog(options) {
    let filterEmojiCommits = true;
    let changelog = fs.readFileSync(options.changelogPath).toString('utf8').split(os.EOL);
    let finalChangelog = [];

    if (options.hasOwnProperty('filterEmojiCommits')) {
        filterEmojiCommits = options.filterEmojiCommits;
    }
    // @NOTE: optional array of string lines, which we pre-pend
    if (options.hasOwnProperty('content') && _.isArray(options.content)) {
        finalChangelog = finalChangelog.concat(options.content);
    }

    if (filterEmojiCommits) {
        changelog = localUtils.filterEmojiCommits(changelog);
    }

    finalChangelog = finalChangelog.concat(changelog);
    return finalChangelog;
}

module.exports.create = (options = {}) => {
    let draft = true;
    let prerelease = false;

    localUtils.checkMissingOptions(options,
        'changelogPath',
        'github',
        'github.username',
        'github.token',
        'userAgent',
        'uri',
        'tagName',
        'releaseName'
    );

    if (options.hasOwnProperty('draft')) {
        draft = options.draft;
    }

    if (options.hasOwnProperty('prerelease')) {
        prerelease = options.prerelease;
    }

    let body = [];
    // CASE: changelogPath can be array of paths with content
    if (_.isArray(options.changelogPath)) {
        options.changelogPath.forEach((opts) => {
            body = body.concat(getFinalChangelog(opts));
        });
    } else {
        // CASE: changelogPath can be a single path(For backward compatibility)
        body = body.concat(getFinalChangelog(options));
    }

    // CASE: clean before upload
    body = body.filter((item) => {
        return item !== undefined;
    });

    if (options.gistUrl) {
        body.push('');
        body.push('You can see the [full change log](' + options.gistUrl + ') for the details of every change included in this release.');
    }

    const auth = 'Basic ' + new Buffer(options.github.username + ':' + options.github.token).toString('base64');

    const reqOptions = {
        uri: options.uri,
        headers: {
            'User-Agent': options.userAgent,
            Authorization: auth
        },
        method: 'POST',
        body: {
            tag_name: options.tagName,
            target_commitish: 'master',
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
        'github.username',
        'github.token',
        'userAgent',
        'uri'
    );

    const auth = 'Basic ' + new Buffer(options.github.username + ':' + options.github.token).toString('base64');
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
