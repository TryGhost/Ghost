this.App.module("PostsApp.Show", function(Show, App, Backbone, Marionette, $, _){
  Show.Layout = Marionette.Layout.extend({
    template: 'preview',
    ui: {
      settings: '.post-settings'
    },
    triggers: {
      "click @ui.settings": "settings:clicked"
    },
    regions: {
      'settingsRegion': '.post-settings-menu'
    },
    closeSettings: function(cb){
      if (this.settingsRegion.currentView){
        return this.settingsRegion.close();
      }

      cb && cb();
    },
    toggleSettings: function(view) {
      var _this = this;

      this.closeSettings(function() {
        $(document).one("click", function() {
          _this.closeSettings();
        });

        _this.settingsRegion.show(view);
      });
    }
  });

  Show.Settings = Marionette.ItemView.extend({
    template: 'post-settings',
    events: {
      "click" : "stopProp"
    },
    stopProp: function(e){
      e.stopPropagation()
    },
    templateHelpers: function(){
      console.log(this.model);
      return {
        published_at_formatted: this.model.getPublishedFormatted()}
    }
  });
});