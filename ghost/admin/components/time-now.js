export default Ember.Component.extend({
  time: function() {
    return new Date();
  }.property()
});