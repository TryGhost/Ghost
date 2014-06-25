var PostController = Ember.ObjectController.extend({
    isPublished: Ember.computed.equal('status', 'published'),
    classNameBindings: ['featured'],

    actions: {
        toggleFeatured: function () {
            var featured = this.toggleProperty('featured'),
                self = this;

            // @TODO This should call closePassive() to only close passive notifications
            self.notifications.closeAll();
            
            this.get('model').save().then(function () {
                self.notifications.showSuccess('Post successfully marked as ' + (featured ? 'featured' : 'not featured') + '.');
            }).catch(function (errors) {
                self.notifications.showErrors(errors);
                return Ember.RSVP.reject(errors);
            });
        }
    }
});

export default PostController;