import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

/*
Example usage:
{{gh-url-preview prefix="tag" slug=theSlugValue tagName="p" classNames="description"}}
*/
export default Component.extend({
    classNames: 'ghost-url-preview',
    prefix: null,
    slug: null,

    config: service(),

    url: computed('slug', function () {
        // Get the blog URL and strip the scheme
        let blogUrl = this.get('config.blogUrl');
        // Remove `http[s]://`
        let noSchemeBlogUrl = blogUrl.substr(blogUrl.indexOf('://') + 3);

        // Get the prefix and slug values
        let prefix = this.get('prefix') ? `${this.get('prefix')}/` : '';
        let slug = this.get('slug') ? `${this.get('slug')}/` : '';

        // Join parts of the URL together with slashes
        let theUrl = `${noSchemeBlogUrl}/${prefix}${slug}`;

        return theUrl;
    })
});
