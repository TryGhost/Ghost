import Ember from 'ember';
import uploader from 'ghost/assets/lib/uploader';

export default Ember.Component.extend({
    classNames: ['image-uploader', 'js-post-image-upload'],

    config: Ember.inject.service(),

    imageSource: Ember.computed('image', function () {
        return this.get('image') || '';
    }),

    // removes event listeners from the uploader
    removeListeners: function () {
        var $this = this.$();

        $this.off();
        $this.find('.js-cancel').off();
    },

    // NOTE: because the uploader is sometimes in the same place in the DOM
    // between transitions Glimmer will re-use the existing elements including
    // those that arealready decorated by jQuery. The following works around
    // situations where the image is changed without a full teardown/rebuild
    didReceiveAttrs: function (attrs) {
        var oldValue = attrs.oldAttrs && Ember.get(attrs.oldAttrs, 'image.value'),
            newValue = attrs.newAttrs && Ember.get(attrs.newAttrs, 'image.value'),
            self = this;

        // always reset when we receive a blank image
        // - handles navigating to populated image from blank image
        if (Ember.isEmpty(newValue) && !Ember.isEmpty(oldValue)) {
            self.$()[0].uploaderUi.reset();
        }

        // re-init if we receive a new image but the uploader is blank
        // - handles back button navigating from blank image to populated image
        if (!Ember.isEmpty(newValue) && this.$()) {
            if (this.$('.js-upload-target').attr('src') === '') {
                this.$()[0].uploaderUi.reset();
                this.$()[0].uploaderUi.initWithImage();
            }
        }
    },

    didInsertElement: function () {
        this.send('initUploader');
    },

    willDestroyElement: function () {
        this.removeListeners();
    },

    actions: {
        initUploader: function () {
            var ref,
                el = this.$(),
                self = this;

            ref = uploader.call(el, {
                editor: true,
                fileStorage: this.get('config.fileStorage')
            });

            el.on('uploadsuccess', function (event, result) {
                if (result && result !== '' && result !== 'http://') {
                    Ember.run(self, function () {
                        this.sendAction('uploaded', result);
                    });
                }
            });

            el.on('imagecleared', Ember.run.bind(self, 'sendAction', 'canceled'));

            this.sendAction('initUploader', ref);
        }
    }
});
