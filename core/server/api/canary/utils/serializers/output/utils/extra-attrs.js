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
    const mapGroupToType = require('./settings-type-group-mapper');

    // @TODO: https://github.com/TryGhost/Ghost/issues/10106
    // @NOTE: Admin & Content API return a different format, needs two mappers
    if (_.isArray(attrs)) {
        attrs.forEach((attr) => {
            attr.type = mapGroupToType(attr.group);
        });

        // CASE: read single setting
        if (frame.original.params && frame.original.params.key) {
            if (frame.original.params.key === 'ghost_head') {
                attrs[0].key = 'ghost_head';
                return;
            }

            if (frame.original.params.key === 'ghost_foot') {
                attrs[0].key = 'ghost_foot';
                return;
            }

            if (frame.original.params.key === 'active_timezone') {
                attrs[0].key = 'active_timezone';
                return;
            }

            if (frame.original.params.key === 'default_locale') {
                attrs[0].key = 'default_locale';
                return;
            }

            if (frame.original.params.key === 'timezone') {
                return;
            }

            if (frame.original.params.key === 'lang') {
                return;
            }

            if (frame.original.params.key === 'slack_url'
                || frame.original.params.key === 'slack_username') {
                return;
            }
        }
        // CASE: edit
        if (frame.original.body && frame.original.body.settings) {
            frame.original.body.settings.forEach((setting) => {
                if (setting.key === 'ghost_head') {
                    const target = _.find(attrs, {key: 'codeinjection_head'});
                    target.key = 'ghost_head';
                } else if (setting.key === 'ghost_foot') {
                    const target = _.find(attrs, {key: 'codeinjection_foot'});
                    target.key = 'ghost_foot';
                } else if (setting.key === 'active_timezone') {
                    const target = _.find(attrs, {key: 'timezone'});
                    target.key = 'active_timezone';
                } else if (setting.key === 'default_locale') {
                    const target = _.find(attrs, {key: 'lang'});
                    target.key = 'default_locale';
                } else if (setting.key === 'locale') {
                    const target = _.find(attrs, {key: 'lang'});
                    target.key = 'locale';
                } else if (setting.key === 'slack') {
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
        const ghostHead = _.cloneDeep(_.find(attrs, {key: 'codeinjection_head'}));
        const ghostFoot = _.cloneDeep(_.find(attrs, {key: 'codeinjection_foot'}));
        const timezone = _.cloneDeep(_.find(attrs, {key: 'timezone'}));
        const lang = _.cloneDeep(_.find(attrs, {key: 'lang'}));
        const slackURL = _.cloneDeep(_.find(attrs, {key: 'slack_url'}));
        const slackUsername = _.cloneDeep(_.find(attrs, {key: 'slack_username'}));
        const locale = _.cloneDeep(_.find(attrs, {key: 'lang'}));

        if (ghostHead) {
            ghostHead.key = 'ghost_head';
            attrs.push(ghostHead);
        }

        if (ghostFoot) {
            ghostFoot.key = 'ghost_foot';
            attrs.push(ghostFoot);
        }

        if (timezone) {
            timezone.key = 'active_timezone';
            attrs.push(timezone);
        }

        if (lang) {
            lang.key = 'default_locale';
            attrs.push(lang);
        }

        if (slackURL || slackUsername) {
            const slack = slackURL || slackUsername;
            slack.key = 'slack';
            slack.value = JSON.stringify([{
                url: slackURL && slackURL.value,
                username: slackUsername && slackUsername.value
            }]);

            attrs.push(slack);
        }

        if (locale) {
            locale.key = 'locale';
            attrs.push(locale);
        }
    }
};
