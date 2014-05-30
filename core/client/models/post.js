var Post = DS.Model.extend({
    uuid: DS.attr('string'),
    title: DS.attr('string'),
    slug: DS.attr('string'),
    markdown: DS.attr('string'),
    html: DS.attr('string'),
    image: DS.attr('string'),
    featured: DS.attr('boolean'),
    page: DS.attr('boolean'),
    status: DS.attr('string'),
    language: DS.attr('string'),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    author: DS.belongsTo('user',  { async: true }),
    created_at: DS.attr('date'),
    created_by: DS.belongsTo('user', { async: true }),
    updated_at: DS.attr('date'),
    updated_by: DS.belongsTo('user', { async: true }),
    published_at: DS.attr('date'),
    published_by: DS.belongsTo('user', { async: true }),
    tags: DS.hasMany('tag', { async: true }),

    generateSlug: function () {
        var title = this.get('title'),
            url;

        if (!title) {
            return;
        }

        url = this.get('ghostPaths').apiUrl('slugs', 'post', encodeURIComponent(title));

        return ic.ajax.request(url, {
                type: 'GET'
            });
    },

    validationErrors: function () {
        var validationErrors = [];

        if (!this.get('title.length')) {
            validationErrors.push({
                message: "You must specify a title for the post."
            });
        }

        return validationErrors;
    }.property('title')
});

export default Post;