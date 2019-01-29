module.exports.forPost = (frame, model, attrs) => {
    const _ = require('lodash');

    if (!frame.options.hasOwnProperty('columns') ||
        (frame.options.columns.includes('excerpt') && frame.options.formats && frame.options.formats.includes('plaintext'))) {
        if (_.isEmpty(attrs.custom_excerpt)) {
            const plaintext = model.get('plaintext');

            if (plaintext) {
                attrs.excerpt = plaintext.substring(0, 500);
            }
        } else {
            attrs.excerpt = attrs.custom_excerpt;
        }
    }
};

// @NOTE: ghost_head & ghost_foot are deprecated, remove in Ghost 3.0
module.exports.forSettings = (attrs) => {
    const _ = require('lodash');

    // @TODO: https://github.com/TryGhost/Ghost/issues/10106
    // @NOTE: Admin & Content API return a different format, need to mappers
    if (_.isArray(attrs)) {
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
