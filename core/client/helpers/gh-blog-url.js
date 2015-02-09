var blogUrl = Ember.HTMLBars.makeBoundHelper(function () {
    return Ember.String.htmlSafe(this.get('config.blogUrl'));
});

export default blogUrl;
