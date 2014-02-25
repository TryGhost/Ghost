(function(Backbone, App){
  _.extend(App, {
    startHistory: function(){
      if (Backbone.history) {
        Backbone.history.start();
      }
    },

    hasCurrentRoute: function(){
      var frag = Backbone.history.fragment;
      return _.isEmpty(frag) ? null : frag;
    },

    navigate: function(route, options){
      var options = (options || {});
      Backbone.history.navigate(route, options);
    }
  })

})(Backbone, App)