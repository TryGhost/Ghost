var _       = require('lodash'),
    Promise = require('bluebird'),
    fs      = require('fs-extra'),
    moment  = require('moment'),

    featuredImageRegex = /^(!\[]\(([^)]*?)\)\s+)(?=#)/,
    titleRegex = /^#\s?([\w\W]*?)(?=\n)/,
    statusRegex = /(published||draft)-/,
    dateRegex = /(\d{4}-\d{2}-\d{2})-/,

    processDateTime,
    processFileName,
    processMarkdownFile,
    MarkdownHandler;

// Takes a date from the filename in y-m-d-h-m form, and converts it into a Date ready to import
processDateTime = function (post, datetime) {
    var format = 'YYYY-MM-DD-HH-mm';
    datetime = moment.utc(datetime, format).valueOf();

    if (post.status && post.status === 'published') {
        post.published_at = datetime;
    } else {
        post.created_at = datetime;
    }

    return post;
};

processFileName = function (filename) {
    var post = {},
        name = filename.split('.')[0],
        match;

    // Parse out the status
    match = name.match(statusRegex);
    if (match) {
        post.status = match[1];
        name = name.replace(match[0], '');
    }

    // Parse out the date
    match = name.match(dateRegex);
    if (match) {
        name = name.replace(match[0], '');
        // Default to middle of the day
        post = processDateTime(post, match[1] + '-12-00');
    }

    post.slug = name;
    post.title = name;

    return post;
};

processMarkdownFile = function (filename, content) {
    var post = processFileName(filename),
        match;

    content = content.replace(/\r\n/gm, '\n');

    // parse out any image which appears before the title
    match = content.match(featuredImageRegex);
    if (match) {
        content = content.replace(match[1], '');
        post.image = match[2];
    }

    // try to parse out a heading 1 for the title
    match = content.match(titleRegex);
    if (match) {
        content = content.replace(titleRegex, '');
        post.title = match[1];
    }

    content = content.replace(/^\n+/, '');

    post.markdown = content;

    return post;
};

MarkdownHandler = {
    type: 'data',
    extensions: ['.md', '.markdown'],
    contentTypes: ['application/octet-stream', 'text/plain'],
    directories: [],

    loadFile: function (files, startDir) {
        var startDirRegex = startDir ? new RegExp('^' + startDir + '/') : new RegExp(''),
            posts = [],
            ops = [];

        _.each(files, function (file) {
            ops.push(Promise.promisify(fs.readFile)(file.path).then(function (content) {
                // normalize the file name
                file.name = file.name.replace(startDirRegex, '');
                // don't include deleted posts
                if (!/^deleted/.test(file.name)) {
                    posts.push(processMarkdownFile(file.name, content.toString()));
                }
            }));
        });

        return Promise.all(ops).then(function () {
            return {meta: {}, data: {posts: posts}};
        });
    }
};

module.exports = MarkdownHandler;
