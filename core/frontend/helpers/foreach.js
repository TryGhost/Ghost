// # Foreach Helper
// Usage: `{{#foreach data}}{{/foreach}}`
//
// Block helper designed for looping through posts
const _ = require('lodash');
const {logging, i18n, hbs, checks} = require('../services/proxy');
const {Utils: hbsUtils, handlebars: {createFrame}} = hbs;
const ghostHelperUtils = require('@tryghost/helpers').utils;

module.exports = function foreach(items, options) {
    if (!options) {
        logging.warn(i18n.t('warnings.helpers.foreach.iteratorNeeded'));
    }

    if (hbsUtils.isFunction(items)) {
        items = items.call(this);
    }
    let visibility = options.hash.visibility;
    if (_.isArray(items) && items.length > 0 && checks.isPost(items[0])) {
        visibility = visibility || 'all';
    } else if (_.isObject(items) && _.isArray(Object.values(items))) {
        if (Object.values(items).length > 0 && checks.isPost(Object.values(items)[0])) {
            visibility = visibility || 'all';
        }
    }
    // Exclude items which should not be visible in the theme
    items = ghostHelperUtils.visibility.filter(items, visibility);

    // Initial values set based on parameters sent through. If nothing sent, set to defaults
    const {fn, inverse, hash, data, ids} = options;
    let {columns, limit, from, to} = hash;
    let length = _.size(items);
    let output = '';
    let frame;
    let contextPath;

    limit = parseInt(limit, 10) || length;
    from = parseInt(from, 10) || 1;
    to = parseInt(to, 10) || length;

    // If a limit option was sent through (aka not equal to default (length))
    // and from plus limit is less than the length, set to to the from + limit
    if ((limit < length) && ((from + limit) <= length)) {
        to = (from - 1) + limit;
    }

    if (data && ids) {
        contextPath = hbsUtils.appendContextPath(data.contextPath, ids[0]) + '.';
    }

    if (data) {
        frame = createFrame(data);
    }

    function execIteration(field, index, last) {
        if (frame) {
            frame.key = field;
            frame.index = index;
            frame.number = index + 1;
            frame.first = index === from - 1; // From uses 1-indexed, but array uses 0-indexed
            frame.last = !!last;
            frame.even = index % 2 === 1;
            frame.odd = !frame.even;
            frame.rowStart = index % columns === 0;
            frame.rowEnd = index % columns === (columns - 1);
            if (contextPath) {
                frame.contextPath = contextPath + field;
            }
        }

        output = output + fn(items[field], {
            data: frame,
            blockParams: hbsUtils.blockParams([items[field], field], [contextPath + field, null])
        });
    }

    function iterateCollection(context) {
        // Context is all posts on the blog
        let current = 1;

        // For each post, if it is a post number that fits within the from and to
        // send the key to execIteration to set to be added to the page
        _.each(context, (value, key) => {
            if (current < from) {
                current += 1;
                return;
            }

            if (current <= to) {
                execIteration(key, current - 1, current === to);
            }

            current += 1;
        });
    }

    if (items && typeof items === 'object') {
        iterateCollection(items);
    }

    if (length === 0) {
        output = inverse(this);
    }

    return output;
};
