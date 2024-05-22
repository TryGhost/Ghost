// # Body Class Helper
// Usage: `{{body_class}}`
//
// Output classes for the body element
const {SafeString} = require('../services/handlebars');

// We use the name body_class to match the helper for consistency
module.exports = function body_class(options) { // eslint-disable-line camelcase
    let classes = [];
    const context = options.data.root.context || [];
    const obj = this.post || this.page;
    const tags = obj && obj.tags ? obj.tags : [];
    const isPage = !!(this.page);

    if (context.includes('home')) {
        classes.push('home-template');
    } else if (context.includes('post') && obj && !isPage) {
        classes.push('post-template');
    } else if (context.includes('page') && obj && isPage) {
        classes.push('page-template');
        classes.push(`page-${obj.slug}`);
    } else if (context.includes('tag') && this.tag) {
        classes.push('tag-template');
        classes.push(`tag-${this.tag.slug}`);
    } else if (context.includes('author') && this.author) {
        classes.push('author-template');
        classes.push(`author-${this.author.slug}`);
    } else if (context.includes('private')) {
        classes.push('private-template');
    }

    if (tags) {
        classes = classes.concat(
            tags.map(({slug}) => `tag-${slug}`)
        );
    }

    if (context.includes('paged')) {
        classes.push('paged');
    }

    classes = classes.join(' ').trim();

    return new SafeString(classes);
};
