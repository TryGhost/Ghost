var PostController = Ember.Controller.extend({
    isPublished: Ember.computed.equal('model.status', 'published'),
    classNameBindings: ['model.featured'],

    authorName: Ember.computed('model.author.name', 'model.author.email', function () {
        return this.get('model.author.name') || this.get('model.author.email');
    }),

    authorAvatar: Ember.computed('model.author.image', function () {
        return this.get('model.author.image') || this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    authorAvatarBackground: Ember.computed('authorAvatar', function () {
        return 'background-image: url(' + this.get('authorAvatar') + ')';
    }),

    actions: {
        toggleFeatured: function () {
            var options = {disableNProgress: true},
                self = this;

            this.toggleProperty('model.featured');
            this.get('model').save(options).catch(function (errors) {
                self.notifications.showErrors(errors);
            });
        },
        showPostContent: function () {
            this.transitionToRoute('posts.post', this.get('model'));
        }
    }
});

export default PostController;
