const readingMinutes = require('@tryghost/helpers').utils.readingMinutes;

module.exports.forPost = (frame, model, attrs) => {
    const _ = require('lodash');

    if (!Object.prototype.hasOwnProperty.call(frame.options, 'columns') ||
        (frame.options.columns.includes('excerpt') && frame.options.formats && frame.options.formats.includes('plaintext'))) {
        if (_.isEmpty(attrs.custom_excerpt)) {
            const plaintext = model.get('plaintext');

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
    // @NOTE: Admin & Content API return a different format, need to mappers
    if (_.isArray(attrs)) {
        // CASE: read single setting
        if (frame.original.params && frame.original.params.key) {
            if (frame.original.params.key === 'codeinjection_head') {
                attrs[0].key = 'codeinjection_head';
                return;
            }

            if (frame.original.params.key === 'codeinjection_foot') {
                attrs[0].key = 'codeinjection_foot';
                return;
            }
        }

        // CASE: edit
        if (frame.original.body && frame.original.body.settings) {
            frame.original.body.settings.forEach((setting) => {
                if (setting.key === 'codeinjection_head') {
                    const target = _.find(attrs, {key: 'ghost_head'});
                    target.key = 'codeinjection_head';
                } else if (setting.key === 'codeinjection_foot') {
                    const target = _.find(attrs, {key: 'ghost_foot'});
                    target.key = 'codeinjection_foot';
                }
            });

            return;
        }

        // CASE: browse all settings, add extra keys and keep deprecated
        const ghostHead = _.cloneDeep(_.find(attrs, {key: 'ghost_head'}));
        const ghostFoot = _.cloneDeep(_.find(attrs, {key: 'ghost_foot'}));

        if (ghostHead) {
            ghostHead.key = 'codeinjection_head';
            attrs.push(ghostHead);
        }

        if (ghostFoot) {
            ghostFoot.key = 'codeinjection_foot';
            attrs.push(ghostFoot);
        }
    } else {
        attrs.codeinjection_head = attrs.ghost_head;
        attrs.codeinjection_foot = attrs.ghost_foot;
    }
};
