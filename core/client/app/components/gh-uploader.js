import Ember from 'ember';
import uploader from 'ghost/assets/lib/uploader';

export default Ember.Component.extend({
    classNames: ['image-uploader', 'js-post-image-upload'],

    config: Ember.inject.service(),

    imageSource: Ember.computed('image', function () {
        return this.get('image') || '';
    }),

    /**
     * Sets up the uploader on render
     */
    setup: function () {
        var $this = this.$(),
            self = this;

        // this.set('uploaderReference', uploader.call($this, {
        //     editor: true,
        //     fileStorage: this.get('config.fileStorage')
        // }));

        $this.on('uploadsuccess', function (event, result) {
            if (result && result !== '' && result !== 'http://') {
                self.sendAction('uploaded', result);
            }
        });

        $this.on('imagecleared', function () {
            self.sendAction('canceled');
        });
    },

    // removes event listeners from the uploader
    removeListeners: function () {
        var $this = this.$();

        $this.off();
        $this.find('.js-cancel').off();
    },

    // didInsertElement: function () {
    //     Ember.run.scheduleOnce('afterRender', this, this.setup());
    // },
    didInsertElement: function () {
        this.send('initUploader');
    },

    willDestroyElement: function () {
        this.removeListeners();
    },

    actions: {
        initUploader: function () {
            var ref,
                el,
                self = this;

            el = this.$();
            ref = uploader.call(el, {
                editor: true,
                fileStorage: this.get('config.fileStorage')
            });

            el.on('uploadsuccess', function (event, result) {
                if (result && result !== '' && result !== 'http://') {
                    self.sendAction('uploaded', result);
                }
            });

            el.on('imagecleared', function () {
                self.sendAction('canceled');
            });

            this.sendAction('initUploader', this.get('uploaderReference'));
        }
    }
});
