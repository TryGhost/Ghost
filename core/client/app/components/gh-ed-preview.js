import Ember from 'ember';
import uploader from 'ghost/assets/lib/uploader';

var Preview = Ember.Component.extend({
    config: Ember.inject.service(),

    didInsertElement: function () {
        this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
        Ember.run.scheduleOnce('afterRender', this, this.dropzoneHandler);
    },

    adjustScrollPosition: function () {
        var scrollWrapper = this.get('scrollWrapper'),
            scrollPosition = this.get('scrollPosition');

        scrollWrapper.scrollTop(scrollPosition);
    }.observes('scrollPosition'),

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
        this.set('height', this.$().height());
    },

    // fire off 'enable' API function from uploadManager
    // might need to make sure markdown has been processed first
    reInitDropzones: function () {
        Ember.run.scheduleOnce('afterRender', this, this.dropzoneHandler);
    }.observes('markdown')
});

export default Preview;
