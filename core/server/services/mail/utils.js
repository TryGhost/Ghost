const _ = require('lodash').runInContext();
const fs = require('fs-extra');
const path = require('path');
const htmlToText = require('html-to-text');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../settings/cache');
const templatesDir = path.resolve(__dirname, '..', 'mail', 'templates');

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

exports.generateContent = function generateContent(options) {
    const defaults = {
        siteUrl: urlUtils.urlFor('home', true),
        siteTitle: settingsCache.get('title')
    };

    const data = _.defaults(defaults, options.data);

    // read the proper email body template
    return fs.readFile(path.join(templatesDir, options.template + '.html'), 'utf8')
        .then(function (content) {
            // insert user-specific data into the email
            const compiled = _.template(content);
            const htmlContent = compiled(data);

            // generate a plain-text version of the same email
            const textContent = htmlToText.fromString(htmlContent);

            return {
                html: htmlContent,
                text: textContent
            };
        });
};
