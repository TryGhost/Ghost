var SlugGenerator = Ember.Object.extend({
    ghostPaths: null,
    slugType: null,
    value: null,
    toString: function () {
        return this.get('value');
    },
    generateSlug: function (textToSlugify) {
        var self = this,
            url;

        if (!textToSlugify) {
            return Ember.RSVP.resolve('');
        }

        url = this.get('ghostPaths.url').api('slugs', this.get('slugType'), encodeURIComponent(textToSlugify));

        return ic.ajax.request(url, {
            type: 'GET'
        }).then(function (response) {
            var slug = response.slugs[0].slug;
            self.set('value', slug);
            return slug;
        });
    }
});

export default SlugGenerator;
