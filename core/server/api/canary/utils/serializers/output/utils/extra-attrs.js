const readingMinutes = require('@tryghost/helpers').utils.readingMinutes;

module.exports.forPost = (frame, model, attrs) => {
    const _ = require('lodash');

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') ||
        (frame.options.columns.includes('excerpt') && frame.options.formats && frame.options.formats.includes('plaintext'))) {
        if (_.isEmpty(attrs.custom_excerpt)) {
            let plaintext = model.get('plaintext');

            if (plaintext) {
                attrs.excerpt = plaintext.substring(0, 500);
            } else {
                attrs.excerpt = null;
            }
        } else {
            attrs.excerpt = attrs.custom_excerpt;
        }
    }

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') ||
    (frame.options.columns.includes('reading_time'))) {
        if (attrs.html) {
            let additionalImages = 0;

            if (attrs.feature_image) {
                additionalImages += 1;
            }

            attrs.reading_time = readingMinutes(attrs.html, additionalImages);
        }
    }
};

module.exports.forSettings = (attrs, frame) => {
    const _ = require('lodash');

    // @TODO: https://github.com/TryGhost/Ghost/issues/10106
    // @NOTE: Admin & Content API return a different format, needs two mappers
    if (_.isArray(attrs)) {
        // CASE: read single setting
        if (frame.original.params && frame.original.params.key) {
            if (frame.original.params.key === 'slack_url'
                || frame.original.params.key === 'slack_username') {
                return;
            }
        }
        // CASE: edit
        if (frame.original.body && frame.original.body.settings) {
            frame.original.body.settings.forEach((setting) => {
                if (setting.key === 'slack') {
                    const slackURL = _.cloneDeep(_.find(attrs, {key: 'slack_url'}));
                    const slackUsername = _.cloneDeep(_.find(attrs, {key: 'slack_username'}));

                    if (slackURL || slackUsername) {
                        const slack = slackURL || slackUsername;
                        slack.key = 'slack';
                        slack.value = JSON.stringify([{
                            url: slackURL && slackURL.value,
                            username: slackUsername && slackUsername.value
                        }]);

                        attrs.push(slack);
                    }
                }
            });

            return;
        }

        // CASE: browse all settings, add extra keys and keep deprecated
        const slackURL = _.cloneDeep(_.find(attrs, {key: 'slack_url'}));
        const slackUsername = _.cloneDeep(_.find(attrs, {key: 'slack_username'}));

        if (slackURL || slackUsername) {
            const slack = slackURL || slackUsername;
            slack.key = 'slack';
            slack.value = JSON.stringify([{
                url: slackURL && slackURL.value,
                username: slackUsername && slackUsername.value
            }]);

            attrs.push(slack);
        }
    }
};
