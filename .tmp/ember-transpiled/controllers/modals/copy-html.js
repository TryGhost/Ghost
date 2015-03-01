define("ghost/controllers/modals/copy-html", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var CopyHTMLController = Ember.Controller.extend({

        generatedHTML: Ember.computed.alias('model.generatedHTML')

    });

    __exports__["default"] = CopyHTMLController;
  });