var PostController = Ember.ObjectController.extend({
    isPublished: Ember.computed.equal('status', 'published'),
    classNameBindings: ['featured'],

    actions: {
        toggleFeatured: function () {
            var featured = this.toggleProperty('featured'),
                self = this;

            this.get('model').save().then(function () {
                self.notifications.closePassive();
                self.notifications.showSuccess('Post successfully marked as ' + (featured ? 'featured' : 'not featured') + '.');
            }).catch(function (errors) {
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default PostController;
