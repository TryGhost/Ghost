var PostController = Ember.ObjectController.extend({
    isPublished: Ember.computed.equal('status', 'published'),

    actions: {
        toggleFeatured: function () {
            this.set('featured', !this.get('featured'));

            this.get('model').save();
        }
    }
});

export default PostController;
