import uploader from 'ghost/assets/lib/uploader';

var Markdown = Ember.Component.extend({
    classNames: ['rendered-markdown'],

    didInsertElement: function () {
        this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
    },

    adjustScrollPosition: function () {
        var scrollWrapper = this.get('scrollWrapper'),
            scrollPosition = this.get('scrollPosition');

        scrollWrapper.scrollTop(scrollPosition);
    }.observes('scrollPosition'),

    // fire off 'enable' API function from uploadManager
    // might need to make sure markdown has been processed first
    reInitDropzones: function () {
        Ember.run.scheduleOnce('afterRender', this, function () {
            var dropzones = $('.js-drop-zone');

            uploader.call(dropzones, {
                editor: true,
                filestorage: false
            });

            dropzones.on('uploadstart', this.sendAction.bind(this, 'uploadStarted'));
            dropzones.on('uploadfailure', this.sendAction.bind(this, 'uploadFinished'));
            dropzones.on('uploadsuccess', this.sendAction.bind(this, 'uploadFinished'));
            dropzones.on('uploadsuccess', this.sendAction.bind(this, 'uploadSuccess'));
        });
    }.observes('markdown')
});

export default Markdown;
