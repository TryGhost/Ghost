define("ghost/components/gh-uploader", 
  ["ghost/assets/lib/uploader","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var uploader = __dependency1__["default"];

    var PostImageUploader = Ember.Component.extend({
        classNames: ['image-uploader', 'js-post-image-upload'],

        setup: function () {
            var $this = this.$(),
                self = this;

            this.set('uploaderReference', uploader.call($this, {
                editor: true,
                fileStorage: this.get('config.fileStorage')
            }));

            $this.on('uploadsuccess', function (event, result) {
                if (result && result !== '' && result !== 'http://') {
                    self.sendAction('uploaded', result);
                }
            });

            $this.on('imagecleared', function () {
                self.sendAction('canceled');
            });
        }.on('didInsertElement'),

        removeListeners: function () {
            var $this = this.$();

            $this.off();
            $this.find('.js-cancel').off();
        }.on('willDestroyElement')
    });

    __exports__["default"] = PostImageUploader;
  });