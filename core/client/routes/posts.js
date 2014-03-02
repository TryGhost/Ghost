import ajax from "ghost/utils/ajax";

export default Ember.Route.extend({
  classNames: "manage",

  model: function() {
    return ajax("/ghost/api/v0.1/posts");
  },

  actions: {
    openEditor: function(post) {
      this.transitionTo('editor', post);
    }
  }
});
