var equal = Ember.computed.equal;

export default Ember.ObjectController.extend({
  isPublished: equal('status', 'published'),
  isDraft: equal('status', 'draft')
});