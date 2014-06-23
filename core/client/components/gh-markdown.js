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
                fileStorage: this.get('config.fileStorage')
            });

            dropzones.on('uploadstart', _.bind(this.sendAction, this, 'uploadStarted'));
            dropzones.on('uploadfailure', _.bind(this.sendAction, this, 'uploadFinished'));
            dropzones.on('uploadsuccess', _.bind(this.sendAction, this, 'uploadFinished'));
            dropzones.on('uploadsuccess', _.bind(this.sendAction, this, 'uploadSuccess'));
        });
    }.observes('markdown')
});

export default Markdown;
