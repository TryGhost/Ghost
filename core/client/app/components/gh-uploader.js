import Ember from 'ember';
import uploader from 'ghost/assets/lib/uploader';

const {
    Component,
    computed,
    get,
    inject: {service},
    isEmpty,
    run
} = Ember;

export default Component.extend({
    classNames: ['image-uploader', 'js-post-image-upload'],

    config: service(),

    imageSource: computed('image', function () {
        return this.get('image') || '';
    }),

    // removes event listeners from the uploader
    removeListeners() {
        let $this = this.$();

        $this.off();
        $this.find('.js-cancel').off();
    },

    // NOTE: because the uploader is sometimes in the same place in the DOM
    // between transitions Glimmer will re-use the existing elements including
    // those that arealready decorated by jQuery. The following works around
    // situations where the image is changed without a full teardown/rebuild
    didReceiveAttrs(attrs) {
        let oldValue = attrs.oldAttrs && get(attrs.oldAttrs, 'image.value');
        let newValue = attrs.newAttrs && get(attrs.newAttrs, 'image.value');

        this._super(...arguments);

        // always reset when we receive a blank image
        // - handles navigating to populated image from blank image
        if (isEmpty(newValue) && !isEmpty(oldValue)) {
            this.$()[0].uploaderUi.reset();
        }

        // re-init if we receive a new image
        // - handles back button navigating from blank image to populated image
        // - handles navigating between populated images

        if (!isEmpty(newValue) && this.$()) {
            this.$('.js-upload-target').attr('src', '');
            this.$()[0].uploaderUi.reset();
            this.$()[0].uploaderUi.initWithImage();
        }
    },

    didInsertElement() {
        this._super(...arguments);
        this.send('initUploader');
    },

    willDestroyElement() {
        this._super(...arguments);
        this.removeListeners();
    },

    actions: {
        initUploader() {
            let el = this.$();
            let ref = uploader.call(el, {
                editor: true,
                fileStorage: this.get('config.fileStorage')
            });

            el.on('uploadsuccess', (event, result) => {
                if (result && result !== '' && result !== 'http://') {
                    run(this, function () {
                        this.sendAction('uploaded', result);
                    });
                }
            });

            el.on('imagecleared', run.bind(this, 'sendAction', 'canceled'));

            this.sendAction('initUploader', ref);
        }
    }
});
