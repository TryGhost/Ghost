import Ember from 'ember';
import uploader from 'ghost/assets/lib/uploader';

export default Ember.Component.extend({
    config: Ember.inject.service(),

    didInsertElement: function () {
        this.set('scrollWrapper', this.$().closest('.entry-preview-content'));
        this.adjustScrollPosition(this.get('scrollPosition'));
        Ember.run.scheduleOnce('afterRender', this, this.dropzoneHandler);
    },

    didReceiveAttrs: function (attrs) {
        if (!attrs.oldAttrs) { return; }

        if (attrs.newAttrs.scrollPosition && attrs.newAttrs.scrollPosition.value !== attrs.oldAttrs.scrollPosition.value) {
            this.adjustScrollPosition(attrs.newAttrs.scrollPosition.value);
        }

        if (attrs.newAttrs.markdown.value !== attrs.oldAttrs.markdown.value) {
            Ember.run.scheduleOnce('afterRender', this, this.dropzoneHandler);
        }
    },

    adjustScrollPosition: function (scrollPosition) {
        var scrollWrapper = this.get('scrollWrapper');

        if (scrollWrapper) {
            scrollWrapper.scrollTop(scrollPosition);
        }
    },

    dropzoneHandler: function () {
        var dropzones = $('.js-drop-zone[data-uploaderui!="true"]');

        if (dropzones.length) {
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
        }
    }
});
