!(function(Marionette){
  Marionette.Renderer.render = function(template, data){
    return JST[template](data);
  }
})(Marionette);