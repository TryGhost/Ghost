var blogUrl = Ember.Handlebars.makeBoundHelper(function () {

    return new Ember.Handlebars.SafeString(this.get('config.blogUrl'));
});

export default blogUrl;