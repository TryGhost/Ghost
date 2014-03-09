var equal = Ember.computed.equal;

var PostController = Ember.ObjectController.extend({
    isPublished: equal('status', 'published'),
    isDraft: equal('status', 'draft')
});

export default PostController;