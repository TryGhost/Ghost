import Ember from 'ember';
import uploader from 'ghost/assets/lib/uploader';

var Preview = Ember.Component.extend({
    config: Ember.inject.service(),

    didInsertElement: function () {
        this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
        Ember.run.scheduleOnce('afterRender', this, this.dropzoneHandler);
    },

    adjustScrollPosition: Ember.observer('scrollPosition', function () {
        var scrollWrapper = this.get('scrollWrapper'),
            scrollPosition = this.get('scrollPosition');

        if (scrollWrapper) {
            scrollWrapper.scrollTop(scrollPosition);
        }
    }),

    dropzoneHandler: function () {
        var dropzones = $('.js-drop-zone');

        uploader.call(dropzones, {
            editor: true,
            fileStorage: this.get('config.fileStorage')
        });

        dropzones.on('uploadstart', Ember.run.bind(this, 'sendAction', 'uploadStarted'));
        dropzones.on('uploadfailure', Ember.run.bind(this, 'sendAction', 'uploadFinished'));
        dropzones.on('uploadsuccess', Ember.run.bind(this, 'sendAction', 'uploadFinished'));
        dropzones.on('uploadsuccess', Ember.run.bind(this, 'sendAction', 'uploadSuccess'));

        // Set the current height so we can listen
        this.sendAction('updateHeight', this.$().height());
    },

    // fire off 'enable' API function from uploadManager
    // might need to make sure markdown has been processed first
    reInitDropzones: Ember.observer('markdown', function () {
        Ember.run.scheduleOnce('afterRender', this, this.dropzoneHandler);
    })
});

export default Preview;
