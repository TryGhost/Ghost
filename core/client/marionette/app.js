window.App = (function(){
  var App = new Marionette.Application;

  App.rootRoute = "/posts"

  App.addInitializer(function(){
    App.addRegions({
      mainRegion: "main"
    });
  });

  App.on("initialize:after", function(){
    App.startHistory();

    if(!App.hasCurrentRoute()){
      App.navigate(App.rootRoute, {trigger: true});
    }
  });

 return App;

})(Marionette);

window.addEventListener("load", function(){
  App.start();
});