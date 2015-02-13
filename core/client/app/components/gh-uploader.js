import uploader from 'ghost/assets/lib/uploader';

var PostImageUploader = Ember.Component.extend({
    classNames: ['image-uploader', 'js-post-image-upload'],

    imageSource: Ember.computed('image', function () {
        return this.get('image') || '';
    }),

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

export default PostImageUploader;
