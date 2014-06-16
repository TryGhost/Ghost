var PostController = Ember.ObjectController.extend({
    isPublished: Ember.computed.equal('status', 'published'),
    classNameBindings: ['featured'],

    actions: {
        toggleFeatured: function () {
            var featured = !this.get('featured'),
                self = this;

            this.set('featured', featured);

            this.get('model').save().then(function () {
                self.notifications.showSuccess('Post successfully marked as ' + (featured ? 'featured' : 'not featured') + '.');
            }, function () {
                self.notifications.showError('An error occured while saving the post.');
            });
        }
    }
});

export default PostController;
