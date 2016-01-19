import Ember from 'ember';
import uploader from 'ghost/assets/lib/uploader';

const {
    $,
    Component,
    inject: {service},
    run
} = Ember;

export default Component.extend({
    config: service(),

    _scrollWrapper: null,

    didInsertElement() {
        this._super(...arguments);
        this._scrollWrapper = this.$().closest('.entry-preview-content');
        this.adjustScrollPosition(this.get('scrollPosition'));
        run.scheduleOnce('afterRender', this, this.dropzoneHandler);
    },

    didReceiveAttrs(attrs) {
        this._super(...arguments);

        if (!attrs.oldAttrs) {
            return;
        }

        if (attrs.newAttrs.scrollPosition && attrs.newAttrs.scrollPosition.value !== attrs.oldAttrs.scrollPosition.value) {
            this.adjustScrollPosition(attrs.newAttrs.scrollPosition.value);
        }

        if (attrs.newAttrs.markdown.value !== attrs.oldAttrs.markdown.value) {
            run.scheduleOnce('afterRender', this, this.dropzoneHandler);
        }
    },

    adjustScrollPosition(scrollPosition) {
        let scrollWrapper = this._scrollWrapper;

        if (scrollWrapper) {
            scrollWrapper.scrollTop(scrollPosition);
        }
    },

    dropzoneHandler() {
        let dropzones = $('.js-drop-zone[data-uploaderui!="true"]');

        if (dropzones.length) {
            uploader.call(dropzones, {
                editor: true,
                fileStorage: this.get('config.fileStorage')
            });

            dropzones.on('uploadstart', run.bind(this, 'sendAction', 'uploadStarted'));
            dropzones.on('uploadfailure', run.bind(this, 'sendAction', 'uploadFinished'));
            dropzones.on('uploadsuccess', run.bind(this, 'sendAction', 'uploadFinished'));
            dropzones.on('uploadsuccess', run.bind(this, 'sendAction', 'uploadSuccess'));

            // Set the current height so we can listen
            this.sendAction('updateHeight', this.$().height());
        }
    }
});
