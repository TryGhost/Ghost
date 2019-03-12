const fs = require('fs');
const requestPromise = require('request-promise');

const localUtils = require('./utils');

module.exports.create = (options = {}) => {
    let isPublic = true;

    localUtils.checkMissingOptions(options,
        'changelogPath',
        'gistName',
        'gistDescription',
        'github',
        'github.username',
        'github.token',
        'userAgent'
    );

    if (options.hasOwnProperty('isPublic')) {
        isPublic = options.isPublic;
    }

    const content = fs.readFileSync(options.changelogPath);
    const files = {};

    files[options.gistName] = {
        content: content.toString('utf8')
    };

    const auth = 'Basic ' + new Buffer(options.github.username + ':' + options.github.token).toString('base64');

    const reqOptions = {
        uri: 'https://api.github.com/gists',
        headers: {
            'User-Agent': options.userAgent,
            Authorization: auth
        },
        method: 'POST',
        body: {
            description: options.gistDescription,
            public: isPublic,
            files: files
        },
        json: true,
        resolveWithFullResponse: true
    };

    return requestPromise(reqOptions)
        .then((response) => {
            return {
                gistUrl: response.body.html_url
            };
        });
};
